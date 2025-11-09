import { motion } from "framer-motion";
import { AssetNode, FlowEdge } from "@/types";
import { useState, useRef, useCallback, useEffect } from "react";

interface NetworkGraphProps {
  nodes: AssetNode[];
  edges: FlowEdge[];
}

export const NetworkGraph = ({ nodes, edges }: NetworkGraphProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [highlightedNodes, setHighlightedNodes] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // ViewBox dimensions - increased to zoom out and ensure all nodes are fully visible
  // Using aspect ratio that matches typical screen (wider)
  // Larger dimensions = more zoomed out = all nodes fit better
  const VIEW_BOX_WIDTH = 4200;
  const VIEW_BOX_HEIGHT = 3150;

  // Initial positions for nodes - centered with more spacing from edges
  // Positions adjusted to be more centered within the larger viewBox
  // Scaled proportionally to match the new viewBox size
  // Y-coordinates shifted down to move content lower in the view
  const initialPositions: Record<string, { x: number; y: number }> = {
    Stocks: { x: 2100, y: 500 },      // Top center - moved down
    Bonds: { x: 600, y: 2350 },       // Left side - moved down
    Commodities: { x: 3600, y: 2500 }, // Right bottom - moved down
    Crypto: { x: 2100, y: 2850 },     // Bottom center - moved down
    Cash: { x: 3700, y: 650 },        // Top right - moved down
  };

  // Node positions state
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>(
    Object.fromEntries(
      Object.entries(initialPositions).map(([id, pos]) => [id, { ...pos }])
    )
  );

  // Static viewBox - larger dimensions make content appear smaller
  const viewBox = `0 0 ${VIEW_BOX_WIDTH} ${VIEW_BOX_HEIGHT}`;

  // Get node base size based on market cap (reflects market size)
  // Then apply flow changes on top of the base size
  const getNodeSize = useCallback((node: AssetNode) => {
    // Find min and max market caps to normalize
    const marketCaps = nodes.map(n => n.marketCap);
    const minMarketCap = Math.min(...marketCaps);
    const maxMarketCap = Math.max(...marketCaps);
    const marketCapRange = maxMarketCap - minMarketCap;
    
    // Base size range (minimum and maximum node sizes)
    const minBaseSize = 350;  // Smallest nodes (smallest market cap)
    const maxBaseSize = 800;  // Largest nodes (largest market cap)
    const baseSizeRange = maxBaseSize - minBaseSize;
    
    // Calculate base size based on market cap (normalized to 0-1, then scaled)
    // This gives us the "original" or "starting" size of the node
    const normalizedMarketCap = marketCapRange > 0 
      ? (node.marketCap - minMarketCap) / marketCapRange 
      : 0.5; // Default to middle if all market caps are the same
    const baseSize = minBaseSize + (normalizedMarketCap * baseSizeRange);
    
    // Apply flow changes: positive flow = increase size, negative flow = decrease size
    // netFlowPct is a percentage (e.g., +5% or -3%)
    // Convert to a multiplier (e.g., +5% = 1.05, -3% = 0.97)
    // Use a scaling factor to make flow changes more visible (multiply by 2)
    const flowMultiplier = 1 + (node.netFlowPct / 100) * 2; // *2 makes changes more pronounced
    const finalSize = baseSize * flowMultiplier;
    
    // Clamp to reasonable bounds (don't let nodes get too small or too large)
    const minSize = 250;
    const maxSize = 1000;
    return Math.max(minSize, Math.min(maxSize, finalSize));
  }, [nodes]);

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

  // Get connected node IDs for a given node
  const getConnectedNodes = useCallback((nodeId: string) => {
    const connected = new Set<string>();
    edges.forEach(edge => {
      if (edge.source === nodeId) connected.add(edge.target);
      if (edge.target === nodeId) connected.add(edge.source);
    });
    return Array.from(connected);
  }, [edges]);

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
    
    // Highlight connected nodes when hovering
    if (foundNode) {
      const connected = getConnectedNodes(foundNode);
      setHighlightedNodes(new Set([foundNode, ...connected]));
    } else {
      setHighlightedNodes(new Set());
    }
  }, [nodes, nodePositions, getNodeSize, getConnectedNodes]);
  
  // Handle mouse leave to clear hover
  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    setHighlightedNodes(new Set());
  }, []);


  // Get edge colors for gradient (source and target)
  const getEdgeColors = (fromNodeId: string, toNodeId: string) => {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    const toNode = nodes.find(n => n.id === toNodeId);
    
    const fromColors = fromNode ? getNodeColor(fromNode.id, fromNode.netFlowPct) : { stroke: "rgb(156, 163, 175)" };
    const toColors = toNode ? getNodeColor(toNode.id, toNode.netFlowPct) : { stroke: "rgb(156, 163, 175)" };
    
    return {
      from: fromColors.stroke,
      to: toColors.stroke,
    };
  };

  // Get edge color based on the node that money flows FROM - for backward compatibility
  const getEdgeColor = (fromNodeId: string) => {
    const fromNode = nodes.find(n => n.id === fromNodeId);
    if (!fromNode) {
      return "rgb(156, 163, 175)";
    }
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

  // Variable edge width based on flow intensity
  // Stronger flows = thicker lines for better visual hierarchy
  const getEdgeWidth = (flowIntensity: number) => {
    const minWidth = 4;
    const maxWidth = 14;
    // Scale flowIntensity (0-1) to width range
    return minWidth + (flowIntensity * (maxWidth - minWidth));
  };

  // Get node color based on asset type and flow state
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

    // Dynamic fill opacity based on flow magnitude
    // Positive flow = brighter (0.25 to 0.4), negative flow = dimmer (0.15 to 0.2)
    const flowMagnitude = Math.abs(netFlowPct);
    const normalizedMagnitude = Math.min(flowMagnitude / 10, 1); // Normalize to 0-1 (10% max)
    
    if (netFlowPct > 0) {
      // Positive flow: increase opacity (0.25 to 0.4)
      const opacity = 0.25 + (normalizedMagnitude * 0.15);
      return {
        fill: colors.fill.replace(/0\.\d+/, opacity.toFixed(2)),
        stroke: colors.stroke,
        lightFill: colors.lightFill,
        pulseColor: "rgba(34, 197, 94, 0.6)" // Green pulse for positive flow
      };
    } else if (netFlowPct < 0) {
      // Negative flow: decrease opacity (0.15 to 0.2)
      const opacity = 0.2 - (normalizedMagnitude * 0.05);
      return {
        fill: colors.fill.replace(/0\.\d+/, Math.max(0.1, opacity).toFixed(2)),
        stroke: colors.stroke,
        lightFill: colors.lightFill,
        pulseColor: "rgba(239, 68, 68, 0.6)" // Red pulse for negative flow
      };
    }
    
    return {
      ...colors,
      pulseColor: "transparent"
    };
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
        y2: toPos.y,
        controlX: (fromPos.x + toPos.x) / 2,
        controlY: (fromPos.y + toPos.y) / 2
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
    
    // Calculate control point for curved edge (perpendicular offset)
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    // Curvature amount (perpendicular offset)
    const curvature = Math.min(distance * 0.15, 200); // 15% of distance, max 200px
    const controlX = midX + (-uy * curvature);
    const controlY = midY + (ux * curvature);
    
    return { x1, y1, x2, y2, controlX, controlY };
  };

  // Check if edge should be highlighted (connected to hovered node)
  const isEdgeHighlighted = (edge: FlowEdge) => {
    if (highlightedNodes.size === 0) return false;
    return highlightedNodes.has(edge.source) || highlightedNodes.has(edge.target);
  };

  // Check if node should be highlighted
  const isNodeHighlighted = (nodeId: string) => {
    if (highlightedNodes.size === 0) return true; // Show all if nothing hovered
    return highlightedNodes.has(nodeId);
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

            {/* Glow filter for high-intensity flows */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
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
            const edgeColors = getEdgeColors(direction.from, direction.to);
            const edgeWidth = getEdgeWidth(edge.flowIntensity);
            const markerId = getArrowMarkerId(direction.from);
            const edgeKey = `${edge.source}-${edge.target}-${index}`;
            const gradientId = `gradient-${edgeKey}`;
            const pathId = `path-${edgeKey}`;
            
            // Check if edge should be highlighted
            const isHighlighted = isEdgeHighlighted(edge);
            const edgeOpacity = isHighlighted ? 1 : (highlightedNodes.size > 0 ? 0.2 : 0.6);
            
            // Calculate path length for animation timing (curved path)
            const pathLength = endpoints.controlX && endpoints.controlY
              ? // Approximate length of curved path
                Math.sqrt(
                  Math.pow(endpoints.controlX - endpoints.x1, 2) + 
                  Math.pow(endpoints.controlY - endpoints.y1, 2)
                ) + Math.sqrt(
                  Math.pow(endpoints.x2 - endpoints.controlX, 2) + 
                  Math.pow(endpoints.y2 - endpoints.controlY, 2)
                )
              : Math.sqrt(
                  Math.pow(endpoints.x2 - endpoints.x1, 2) + 
                  Math.pow(endpoints.y2 - endpoints.y1, 2)
                );
            
            // Animation duration based on flow intensity (faster = higher intensity)
            // Stronger flows move faster (1-3 seconds)
            const animationDuration = Math.max(1, 3 - (edge.flowIntensity * 2));
            
            // Calculate number of particles based on flow intensity
            const particleCount = Math.max(1, Math.floor(edge.flowIntensity * 5));
            
            // High intensity threshold for glow effect
            const isHighIntensity = edge.flowIntensity > 0.7;

            // Create curved path string
            const pathString = endpoints.controlX && endpoints.controlY
              ? `M ${endpoints.x1} ${endpoints.y1} Q ${endpoints.controlX} ${endpoints.controlY} ${endpoints.x2} ${endpoints.y2}`
              : `M ${endpoints.x1} ${endpoints.y1} L ${endpoints.x2} ${endpoints.y2}`;

            return (
              <g key={edgeKey} opacity={edgeOpacity}>
                <defs>
                  {/* Gradient definition for this edge */}
                  <linearGradient id={gradientId} gradientUnits="userSpaceOnUse"
                    x1={endpoints.x1} y1={endpoints.y1}
                    x2={endpoints.x2} y2={endpoints.y2}>
                    <stop offset="0%" stopColor={edgeColors.from} stopOpacity="0.9" />
                    <stop offset="50%" stopColor={edgeColors.from} stopOpacity="0.7" />
                    <stop offset="100%" stopColor={edgeColors.to} stopOpacity="0.9" />
                  </linearGradient>
                </defs>
                
                {/* Path for particles to follow (curved) */}
                <path
                  id={pathId}
                  d={pathString}
                  fill="none"
                  stroke="none"
                />

                {/* Main flow line with gradient (curved) */}
                <motion.path
                  d={pathString}
                  stroke={`url(#${gradientId})`}
                  strokeWidth={edgeWidth}
                  fill="none"
                  markerEnd={`url(#${markerId})`}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter={isHighIntensity ? "url(#glow)" : undefined}
                  animate={{ 
                    opacity: Math.max(0.4, Math.min(1, 0.5 + edge.flowIntensity * 0.5)),
                    strokeWidth: edgeWidth,
                  }}
                  transition={{ 
                    duration: 0.5,
                    ease: "easeInOut"
                  }}
                />

                {/* Animated dashed stroke for motion effect (curved) */}
                <motion.path
                  d={pathString}
                  stroke={`url(#${gradientId})`}
                  strokeWidth={edgeWidth * 0.6}
                  strokeDasharray="15,10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                  opacity={0.6}
                  animate={{
                    strokeDashoffset: [0, -25],
                  }}
                  transition={{
                    duration: animationDuration,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Animated particles moving along the flow */}
                {Array.from({ length: particleCount }).map((_, particleIndex) => {
                  const delay = (particleIndex / particleCount) * animationDuration;
                  const particleSize = 3 + (edge.flowIntensity * 2);
                  
                  return (
                    <circle
                      key={`particle-${particleIndex}`}
                      r={particleSize}
                      fill={edgeColors.from}
                      opacity={0.8}
                    >
                      <animateMotion
                        dur={`${animationDuration}s`}
                        repeatCount="indefinite"
                        begin={`${delay}s`}
                      >
                        <mpath href={`#${pathId}`} />
                      </animateMotion>
                      <animate
                        attributeName="opacity"
                        values="0.3;0.9;0.3"
                        dur={`${animationDuration}s`}
                        repeatCount="indefinite"
                        begin={`${delay}s`}
                      />
                    </circle>
                  );
                })}
              </g>
            );
          })}

              {/* Nodes */}
              {nodes.map((node) => {
                const pos = nodePositions[node.id];
                if (!pos) return null;
                const size = getNodeSize(node);
                const nodeColors = getNodeColor(node.id, node.netFlowPct);
                const isHighlighted = isNodeHighlighted(node.id);
                const nodeOpacity = isHighlighted ? 1 : (highlightedNodes.size > 0 ? 0.3 : 1);
                const hasSignificantFlow = Math.abs(node.netFlowPct) > 3;
                const flowMagnitude = Math.abs(node.netFlowPct);

                return (
                  <g key={node.id} opacity={nodeOpacity}>
                    {/* Pulsing ring for nodes with significant flow */}
                    {hasSignificantFlow && (
                      <motion.circle
                        cx={pos.x}
                        cy={pos.y}
                        r={size / 2 + 15}
                        fill="none"
                        stroke={nodeColors.pulseColor || nodeColors.stroke}
                        strokeWidth={4}
                        className="pointer-events-none"
                        animate={{
                          r: [size / 2 + 15, size / 2 + 25, size / 2 + 15],
                          opacity: [0.6, 0.2, 0.6],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}

                    {/* Node shadow for depth */}
                    <circle
                      cx={pos.x + 3}
                      cy={pos.y + 3}
                      r={size / 2}
                      fill="rgba(0, 0, 0, 0.2)"
                      className="pointer-events-none"
                    />

                    {/* Main node circle */}
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={size / 2}
                      fill={nodeColors.fill}
                      stroke={nodeColors.stroke}
                      strokeWidth={isHighlighted && hoveredNode === node.id ? 8 : 6}
                      className="pointer-events-none"
                      style={{ filter: isHighlighted && hoveredNode === node.id ? "drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))" : "none" }}
                      animate={{ 
                        r: size / 2,
                        fill: nodeColors.fill,
                        stroke: nodeColors.stroke,
                      }}
                      transition={{ 
                        duration: 0.6,
                        ease: "easeInOut"
                      }}
                    />

                    {/* Invisible hit area for better hover detection */}
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={size / 2 + 20}
                      fill="transparent"
                      className="cursor-pointer"
                      style={{ pointerEvents: 'all' }}
                      animate={{ r: size / 2 + 20 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />

                    {/* Node label */}
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

                    {/* Flow percentage label */}
                    {Math.abs(node.netFlowPct) > 0.5 && (
                      <text
                        x={pos.x}
                        y={pos.y - size / 2 - 25}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-semibold pointer-events-none"
                        style={{ 
                          userSelect: 'none', 
                          fontSize: '40px',
                          fill: node.netFlowPct > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                        }}
                      >
                        {node.netFlowPct > 0 ? '+' : ''}{node.netFlowPct.toFixed(1)}%
                      </text>
                    )}
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
