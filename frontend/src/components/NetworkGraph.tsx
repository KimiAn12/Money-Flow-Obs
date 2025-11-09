import { motion } from "framer-motion";
import { AssetNode, FlowEdge } from "@/types";
import { useState, useRef, useCallback, useEffect } from "react";

interface NetworkGraphProps {
  nodes: AssetNode[];
  edges: FlowEdge[];
}

export const NetworkGraph = ({ nodes, edges }: NetworkGraphProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ViewBox dimensions - slightly increased to make graph appear smaller and ensure all nodes fit
  // Using aspect ratio that matches typical screen (wider)
  // Increasing dimensions makes content appear smaller, ensuring all nodes are visible
  const VIEW_BOX_WIDTH = 3600;
  const VIEW_BOX_HEIGHT = 2700;

  // Initial positions for nodes - centered with more spacing from edges
  // Positions adjusted to be more centered within the larger viewBox
  const initialPositions: Record<string, { x: number; y: number }> = {
    Stocks: { x: 1800, y: 300 },      // Top center
    Bonds: { x: 500, y: 1900 },       // Left side - moved in from edge
    Commodities: { x: 3100, y: 2000 }, // Right bottom - moved in from edge
    Crypto: { x: 1800, y: 2300 },     // Bottom center - moved up from edge
    Cash: { x: 3200, y: 400 },        // Top right - moved in from edge
  };

  // Node positions state
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(
    Object.fromEntries(
      Object.entries(initialPositions).map(([id, pos]) => [id, { ...pos }])
    )
  );

  // Static viewBox - larger dimensions make content appear smaller
  const viewBox = `0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`;

  // Get node size based on flow - larger nodes = positive flow (inflow), smaller nodes = negative flow (outflow)
  // node.size is calculated as 1 + (netFlowPct / 100), so:
  // - Positive flow (e.g., +5%) -> size = 1.05 -> larger node
  // - Negative flow (e.g., -5%) -> size = 0.95 -> smaller node
  // Use a more pronounced scaling to make size differences more apparent
  // Very large base size for much bigger nodes
  const getNodeSize = useCallback((node: AssetNode) => {
    const baseSize = 500;
    const minSize = 300;
    const maxSize = 1000;
    
    // Apply a more aggressive scaling factor to make differences more visible
    // Scale the size difference by 3x to make it more apparent
    // node.size ranges from ~0.95 to ~1.05, so we'll scale this range
    const sizeDifference = (node.size - 1) * 3; // Multiply the difference by 3
    const flowBasedSize = baseSize * (1 + sizeDifference);
    
    // Clamp to min/max bounds
    return Math.max(minSize, Math.min(maxSize, flowBasedSize));
  }, []);

  // Update node positions when nodes change
  useEffect(() => {
    setNodePositions(prevPositions => {
      const newPositions: Record<string, { x: number; y: number }> = {};
      nodes.forEach(node => {
        if (prevPositions[node.id]) {
          // Keep existing position
          newPositions[node.id] = prevPositions[node.id];
        } else if (initialPositions[node.id]) {
          // Use initial position
          newPositions[node.id] = initialPositions[node.id];
        } else {
          // Fallback: assign a default position if node doesn't exist in initialPositions
          newPositions[node.id] = { x: VIEW_BOX_WIDTH / 2, y: VIEW_BOX_HEIGHT / 2 }; // Center position as fallback
        }
      });
      return newPositions;
    });
  }, [nodes]);

  // Handle mouse move to detect hover over nodes - improved accuracy
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    
    // Create SVG point for coordinate transformation
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    // Transform screen coordinates to SVG coordinates using the current transform matrix
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const svgPoint = pt.matrixTransform(ctm.inverse());
    
    // Check which node the mouse is over
    let foundNode: string | null = null;
    let closestDistance = Infinity;
    
    nodes.forEach(node => {
      const pos = nodePositions[node.id];
      if (!pos) return;
      
      const nodeSize = getNodeSize(node);
      const dx = svgPoint.x - pos.x;
      const dy = svgPoint.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      // Check if mouse is within node radius (with some padding for better hover detection)
      const hitRadius = nodeSize / 2 + 25;
      if (distance <= hitRadius && distance < closestDistance) {
        foundNode = node.id;
        closestDistance = distance;
      }
    });
    
    setHoveredNode(foundNode);
  }, [nodes, nodePositions, getNodeSize]);
  
  // Handle mouse leave to clear hover
  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
  }, []);


  // Get edge color based on the node that money flows FROM - solid color, no opacity
  const getEdgeColor = (fromNodeId: string) => {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    if (!fromNode) {
      // Default fallback color
      return "rgb(156, 163, 175)";
    }
    
    // Use the exact same stroke color as the source node
    const nodeColors = getNodeColor(fromNode.id, fromNode.netFlowPct);
    return nodeColors.stroke;
  };
  
  // Get arrow marker ID based on the node that money flows FROM
  const getArrowMarkerId = (fromNodeId: string) => {
    const markerMap: Record<string, string> = {
      Stocks: "arrowhead-green",
      Bonds: "arrowhead-blue",
      Commodities: "arrowhead-yellow",
      Crypto: "arrowhead-purple",
      Cash: "arrowhead-pink"
    };
    
    return markerMap[fromNodeId] || "arrowhead-gray";
  };

  // All edges have the same width - node sizes show the flow instead
  // Much larger edge width for bigger graph
  const getEdgeWidth = () => {
    return 6;
  };

  // Get node color based on asset type
  const getNodeColor = (nodeId: string, netFlowPct: number) => {
    const colorMap: Record<string, { fill: string; stroke: string; lightFill: string }> = {
      Stocks: {
        fill: "rgba(34, 197, 94, 0.2)", // green
        stroke: "rgb(34, 197, 94)",
        lightFill: "rgba(34, 197, 94, 0.1)"
      },
      Bonds: {
        fill: "rgba(59, 130, 246, 0.2)", // blue
        stroke: "rgb(59, 130, 246)",
        lightFill: "rgba(59, 130, 246, 0.1)"
      },
      Commodities: {
        fill: "rgba(234, 179, 8, 0.2)", // yellow/gold
        stroke: "rgb(234, 179, 8)",
        lightFill: "rgba(234, 179, 8, 0.1)"
      },
      Crypto: {
        fill: "rgba(168, 85, 247, 0.2)", // purple
        stroke: "rgb(168, 85, 247)",
        lightFill: "rgba(168, 85, 247, 0.1)"
      },
      Cash: {
        fill: "rgba(236, 72, 153, 0.2)", // pink
        stroke: "rgb(236, 72, 153)",
        lightFill: "rgba(236, 72, 153, 0.1)"
      }
    };

    const colors = colorMap[nodeId] || {
      fill: "rgba(156, 163, 175, 0.2)", // gray default
      stroke: "rgb(156, 163, 175)",
      lightFill: "rgba(156, 163, 175, 0.1)"
    };

    // Adjust opacity based on flow (positive flow = brighter, negative = dimmer)
    if (netFlowPct > 0) {
      return {
        fill: colors.fill.replace("0.2", "0.3"),
        stroke: colors.stroke,
        lightFill: colors.lightFill
      };
    } else if (netFlowPct < 0) {
      return {
        fill: colors.fill.replace("0.2", "0.15"),
        stroke: colors.stroke,
        lightFill: colors.lightFill
      };
    }
    
    return colors;
  };

  // Calculate arrow direction based on netFlowPct difference
  // Flow goes from node with lower netFlowPct to node with higher netFlowPct
  const getEdgeDirection = (edge: FlowEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    
    if (!sourceNode || !targetNode) {
      return { from: edge.source, to: edge.target };
    }
    
    // Money flows from asset with negative/lower flow to asset with positive/higher flow
    if (sourceNode.netFlowPct < targetNode.netFlowPct) {
      return { from: edge.source, to: edge.target };
    } else if (targetNode.netFlowPct < sourceNode.netFlowPct) {
      return { from: edge.target, to: edge.source };
    }
    
    return { from: edge.source, to: edge.target };
  };

  // Calculate edge endpoint offset to account for node radius
  const getEdgeEndpoints = (fromId: string, toId: string, fromPos: { x: number; y: number }, toPos: { x: number; y: number }) => {
    const fromNode = nodes.find(n => n.id === fromId);
    const toNode = nodes.find(n => n.id === toId);
    const fromSize = fromNode ? getNodeSize(fromNode) / 2 : 30;
    const toSize = toNode ? getNodeSize(toNode) / 2 : 30;
    
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If nodes are too close together, draw a minimal edge
    if (distance < 1) {
      // Draw a small edge to ensure visibility
      return { 
        x1: fromPos.x - 5, 
        y1: fromPos.y, 
        x2: toPos.x + 5, 
        y2: toPos.y 
      };
    }
    
    // Calculate unit vector
    const ux = dx / distance;
    const uy = dy / distance;
    
    // Offset from node centers to avoid overlap
    const x1 = fromPos.x + ux * fromSize;
    const y1 = fromPos.y + uy * fromSize;
    const x2 = toPos.x - ux * toSize;
    const y2 = toPos.y - uy * toSize;
    
    return { x1, y1, x2, y2 };
  };

  return (
    <div className="relative w-full h-full glass-card rounded-lg border border-border/50 overflow-hidden">
      {/* Graph Container */}
      <div
        ref={containerRef}
        className="w-full h-full"
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Arrow markers for directed edges - matching node colors */}
            <marker
              id="arrowhead-green"
              markerWidth="25"
              markerHeight="25"
              refX="22"
              refY="7.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 25 7.5, 0 15"
                fill="rgb(34, 197, 94)"
              />
            </marker>
            <marker
              id="arrowhead-blue"
              markerWidth="25"
              markerHeight="25"
              refX="22"
              refY="7.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 25 7.5, 0 15"
                fill="rgb(59, 130, 246)"
              />
            </marker>
            <marker
              id="arrowhead-yellow"
              markerWidth="25"
              markerHeight="25"
              refX="22"
              refY="7.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 25 7.5, 0 15"
                fill="rgb(234, 179, 8)"
              />
            </marker>
            <marker
              id="arrowhead-purple"
              markerWidth="25"
              markerHeight="25"
              refX="22"
              refY="7.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 25 7.5, 0 15"
                fill="rgb(168, 85, 247)"
              />
            </marker>
            <marker
              id="arrowhead-pink"
              markerWidth="25"
              markerHeight="25"
              refX="22"
              refY="7.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 25 7.5, 0 15"
                fill="rgb(236, 72, 153)"
              />
            </marker>
            <marker
              id="arrowhead-gray"
              markerWidth="25"
              markerHeight="25"
              refX="22"
              refY="7.5"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 25 7.5, 0 15"
                fill="rgb(156, 163, 175)"
              />
            </marker>
          </defs>

          {/* Edges */}
          {edges.map((edge, index) => {
            const direction = getEdgeDirection(edge);
            const fromPos = nodePositions[direction.from];
            const toPos = nodePositions[direction.to];
            
            // Check if both node positions exist
            if (!fromPos || !toPos) {
              return null;
            }

            const endpoints = getEdgeEndpoints(direction.from, direction.to, fromPos, toPos);
            const edgeColor = getEdgeColor(direction.from);
            const edgeWidth = getEdgeWidth();
            const markerId = getArrowMarkerId(direction.from);

            // Create a unique key based on the original edge source and target
            // This ensures each edge is uniquely identified regardless of direction reversal
            const edgeKey = `${edge.source}-${edge.target}-${index}`;

            return (
              <motion.line
                key={edgeKey}
                x1={endpoints.x1}
                y1={endpoints.y1}
                x2={endpoints.x2}
                y2={endpoints.y2}
                stroke={edgeColor}
                strokeWidth={edgeWidth}
                markerEnd={`url(#${markerId})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1, delay: index * 0.05 }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = nodePositions[node.id];
            if (!pos) return null;
            const size = getNodeSize(node);
            const nodeColors = getNodeColor(node.id, node.netFlowPct);

            return (
              <g key={node.id}>
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size / 2}
                  fill={nodeColors.fill}
                  stroke={nodeColors.stroke}
                  strokeWidth={6}
                  className="pointer-events-none"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                />
                {/* Invisible hit area for better hover detection */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size / 2 + 20}
                  fill="transparent"
                  className="cursor-pointer"
                  style={{ pointerEvents: 'all' }}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="font-bold pointer-events-none fill-foreground"
                  style={{ userSelect: 'none', fontSize: '72px' }}
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Node Tooltip - positioned directly to the left of the node */}
      {hoveredNode && (() => {
        const node = nodes.find(n => n.id === hoveredNode);
        const pos = nodePositions[hoveredNode];
        if (!node || !pos || !svgRef.current || !containerRef.current) return null;
        const nodeColors = getNodeColor(node.id, node.netFlowPct);
        const isPositiveFlow = node.netFlowPct > 0;

        // Get the SVG element and container
        const svg = svgRef.current;
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        
        // Get the actual node size in SVG coordinates
        const nodeSize = getNodeSize(node);
        const nodeRadius = nodeSize / 2;
        
        // Calculate the left edge and top of the node in SVG coordinates
        const nodeLeftEdgeX = pos.x - nodeRadius;
        const nodeTopY = pos.y - nodeRadius;
        
        // Create SVG point for the left edge at the top of the node
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = nodeLeftEdgeX;
        svgPoint.y = nodeTopY;
        
        // Convert SVG coordinates to screen coordinates
        const ctm = svg.getScreenCTM();
        if (!ctm) return null;
        
        const screenPoint = svgPoint.matrixTransform(ctm);
        
        // Get tooltip dimensions (measure actual size)
        const tooltipWidth = 200; // Fixed width for consistency
        const tooltipHeight = 110; // Approximate height
        const spacing = 15; // Space between node edge and tooltip
        
        // Different vertical offsets for different nodes
        // Stocks and Cash need to be moved up more
        const isStocksOrCash = node.id === 'Stocks' || node.id === 'Cash';
        const verticalOffset = isStocksOrCash ? 160 : 120; // More offset for Stocks and Cash
        
        // Position tooltip to the left of the node's left edge, positioned much higher up
        let tooltipX = screenPoint.x - tooltipWidth - spacing;
        // Position tooltip above the top of the node with additional offset
        let tooltipY = screenPoint.y - tooltipHeight - verticalOffset;
        
        // Ensure tooltip stays within container bounds
        const padding = 10;
        if (tooltipX < containerRect.left + padding) {
          tooltipX = containerRect.left + padding;
        }
        
        // If tooltip goes above container, position it at the top
        if (tooltipY < containerRect.top + padding) {
          tooltipY = containerRect.top + padding;
        }
        
        // If tooltip would go off bottom, allow it but keep it reasonable
        if (tooltipY + tooltipHeight > containerRect.bottom - padding) {
          tooltipY = screenPoint.y - tooltipHeight - 20; // Just above node center if needed
        }

        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, x: -5 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.95, x: -5 }}
            transition={{ duration: 0.15 }}
            className="fixed z-30 glass-card p-3 rounded-lg border border-border/50 shadow-lg pointer-events-none"
            style={{
              left: `${tooltipX}px`,
              top: `${tooltipY}px`,
              width: `${tooltipWidth}px`,
            }}
          >
            <div className="text-sm font-semibold text-foreground mb-1">{node.id}</div>
            <div className="text-xs text-muted-foreground">
              Net Flow: <span className={isPositiveFlow ? "text-cyan-500" : "text-purple-500"}>
                {node.netFlowPct > 0 ? "+" : ""}{node.netFlowPct.toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Size: {node.size.toFixed(3)}
            </div>
            <div className="text-xs text-muted-foreground">
              Market Cap: ${(node.marketCap / 1000).toFixed(1)}B
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
};
