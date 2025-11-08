import { motion } from "framer-motion";
import { AssetNode, FlowEdge } from "@/types";
import { useState, useRef, useCallback, useEffect } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NetworkGraphProps {
  nodes: AssetNode[];
  edges: FlowEdge[];
}

export const NetworkGraph = ({ nodes, edges }: NetworkGraphProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Fixed viewBox dimensions
  const VIEW_BOX_WIDTH = 1200;
  const VIEW_BOX_HEIGHT = 800;

  // Initial positions for nodes (centered layout within viewBox)
  const initialPositions: Record<string, { x: number; y: number }> = {
    Stocks: { x: 600, y: 250 },
    Bonds: { x: 350, y: 500 },
    Commodities: { x: 850, y: 450 },
    Crypto: { x: 600, y: 600 },
    Cash: { x: 750, y: 200 },
  };

  // Node positions state
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(
    Object.fromEntries(
      Object.entries(initialPositions).map(([id, pos]) => [id, { ...pos }])
    )
  );

  // Calculate dynamic viewBox based on pan and zoom
  const getViewBox = useCallback(() => {
    const centerX = VIEW_BOX_WIDTH / 2;
    const centerY = VIEW_BOX_HEIGHT / 2;
    const scaledWidth = VIEW_BOX_WIDTH / zoom;
    const scaledHeight = VIEW_BOX_HEIGHT / zoom;
    const minX = centerX - scaledWidth / 2 - pan.x / zoom;
    const minY = centerY - scaledHeight / 2 - pan.y / zoom;
    return `${minX} ${minY} ${scaledWidth} ${scaledHeight}`;
  }, [zoom, pan]);

  // Update node positions when nodes change
  useEffect(() => {
    const newPositions: Record<string, { x: number; y: number }> = {};
    nodes.forEach(node => {
      if (nodePositions[node.id]) {
        // Keep existing position
        newPositions[node.id] = nodePositions[node.id];
      } else if (initialPositions[node.id]) {
        // Use initial position
        newPositions[node.id] = initialPositions[node.id];
      } else {
        // Fallback: assign a default position if node doesn't exist in initialPositions
        newPositions[node.id] = { x: 600, y: 400 }; // Center position as fallback
      }
    });
    // Always update positions if we have nodes
    if (nodes.length > 0) {
      setNodePositions(newPositions);
    }
  }, [nodes]);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, zoom * delta));
    
    if (containerRef.current && svgRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const svgRect = svgRef.current.getBoundingClientRect();
      
      // Mouse position relative to SVG
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Current viewBox
      const currentViewBox = getViewBox();
      const [vbMinX, vbMinY, vbWidth, vbHeight] = currentViewBox.split(' ').map(Number);
      
      // Mouse position in SVG coordinates
      const svgX = vbMinX + (mouseX / svgRect.width) * vbWidth;
      const svgY = vbMinY + (mouseY / svgRect.height) * vbHeight;
      
      // New viewBox dimensions
      const newVbWidth = VIEW_BOX_WIDTH / newZoom;
      const newVbHeight = VIEW_BOX_HEIGHT / newZoom;
      
      // Calculate new pan to keep point under mouse fixed
      const newPanX = (svgX - VIEW_BOX_WIDTH / 2) * zoom - (svgX - VIEW_BOX_WIDTH / 2) * newZoom;
      const newPanY = (svgY - VIEW_BOX_HEIGHT / 2) * zoom - (svgY - VIEW_BOX_HEIGHT / 2) * newZoom;
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    }
  }, [zoom, pan, getViewBox]);

  // Handle mouse down for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      if (svgRef.current && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const svgRect = svgRef.current.getBoundingClientRect();
        const currentViewBox = getViewBox();
        const [, , vbWidth, vbHeight] = currentViewBox.split(' ').map(Number);
        
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const svgX = (mouseX / svgRect.width) * vbWidth;
        const svgY = (mouseY / svgRect.height) * vbHeight;
        
        setDragStart({ x: svgX - pan.x, y: svgY - pan.y });
      }
    }
  }, [pan, getViewBox]);

  // Handle mouse move for panning
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && svgRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const svgRect = svgRef.current.getBoundingClientRect();
      const currentViewBox = getViewBox();
      const [, , vbWidth, vbHeight] = currentViewBox.split(' ').map(Number);
      
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const svgX = (mouseX / svgRect.width) * vbWidth;
      const svgY = (mouseY / svgRect.height) * vbHeight;
      
      setPan({
        x: svgX - dragStart.x,
        y: svgY - dragStart.y,
      });
    }
  }, [isDragging, dragStart, getViewBox]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset view
  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Get node size based on flow - larger nodes = positive flow (inflow), smaller nodes = negative flow (outflow)
  // node.size is calculated as 1 + (netFlowPct / 100), so:
  // - Positive flow (e.g., +5%) -> size = 1.05 -> larger node
  // - Negative flow (e.g., -5%) -> size = 0.95 -> smaller node
  // Use a more pronounced scaling to make size differences more apparent
  const getNodeSize = (node: AssetNode) => {
    const baseSize = 60;
    const minSize = 30;
    const maxSize = 140;
    
    // Apply a more aggressive scaling factor to make differences more visible
    // Scale the size difference by 3x to make it more apparent
    // node.size ranges from ~0.95 to ~1.05, so we'll scale this range
    const sizeDifference = (node.size - 1) * 3; // Multiply the difference by 3
    const flowBasedSize = baseSize * (1 + sizeDifference);
    
    // Clamp to min/max bounds
    return Math.max(minSize, Math.min(maxSize, flowBasedSize));
  };

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
  const getEdgeWidth = () => {
    return 2;
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

  const viewBox = getViewBox();

  return (
    <div className="relative w-full h-full glass-card rounded-lg border border-border/50 overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          className="glass-card border-border/50"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setZoom(prev => Math.max(0.5, prev * 0.8))}
          className="glass-card border-border/50"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          className="glass-card border-border/50"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </Button>
      </div>

      {/* Graph Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox={viewBox}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Arrow markers for directed edges - matching node colors */}
            <marker
              id="arrowhead-green"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="rgb(34, 197, 94)"
              />
            </marker>
            <marker
              id="arrowhead-blue"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="rgb(59, 130, 246)"
              />
            </marker>
            <marker
              id="arrowhead-yellow"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="rgb(234, 179, 8)"
              />
            </marker>
            <marker
              id="arrowhead-purple"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="rgb(168, 85, 247)"
              />
            </marker>
            <marker
              id="arrowhead-pink"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="rgb(236, 72, 153)"
              />
            </marker>
            <marker
              id="arrowhead-gray"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <polygon
                points="0 0, 10 3, 0 6"
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
                  strokeWidth={2}
                  className="pointer-events-none"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={size / 2}
                  fill="transparent"
                  className="cursor-pointer"
                  style={{ pointerEvents: 'all' }}
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    setHoveredNode(node.id);
                  }}
                  onMouseLeave={(e) => {
                    e.stopPropagation();
                    setHoveredNode(null);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                />
                <text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="text-xs font-bold pointer-events-none fill-foreground"
                  style={{ userSelect: 'none' }}
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Node Tooltip */}
      {hoveredNode && (() => {
        const node = nodes.find(n => n.id === hoveredNode);
        const pos = nodePositions[hoveredNode];
        if (!node || !pos || !containerRef.current || !svgRef.current) return null;
        const nodeColors = getNodeColor(node.id, node.netFlowPct);
        const isPositiveFlow = node.netFlowPct > 0;

        // Calculate screen position using SVG point conversion
        const containerRect = containerRef.current.getBoundingClientRect();
        const svgPoint = svgRef.current.createSVGPoint();
        svgPoint.x = pos.x;
        svgPoint.y = pos.y;
        
        // Convert to screen coordinates
        const ctm = svgRef.current.getScreenCTM();
        if (!ctm) return null;
        
        const screenX = svgPoint.matrixTransform(ctm).x;
        const screenY = svgPoint.matrixTransform(ctm).y;
        const nodeSize = getNodeSize(node);
        
        // Scale node size for screen coordinates
        const nodeSizeScreen = nodeSize * (ctm.a || 1);

        return (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed z-30 glass-card p-3 rounded-lg border border-border/50 shadow-lg pointer-events-none"
            style={{
              left: `${screenX}px`,
              top: `${screenY + nodeSizeScreen / 2 + 15}px`,
              transform: 'translateX(-50%)',
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
