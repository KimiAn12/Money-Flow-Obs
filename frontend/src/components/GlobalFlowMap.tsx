import { motion } from "framer-motion";
import { GlobalFlow, RegionData } from "@/types";
import { useState, useRef, useCallback } from "react";

interface GlobalFlowMapProps {
  regions: RegionData[];
  flows: GlobalFlow[];
  assetType: 'equities' | 'bonds' | 'currency';
}

export const GlobalFlowMap = ({ regions, flows, assetType }: GlobalFlowMapProps) => {
  const [hoveredRegion, setHoveredRegion] = useState<RegionData | null>(null);
  const [highlightedRegions, setHighlightedRegions] = useState<Set<string>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Geographic positions on world map (percentage-based, then scaled to SVG coordinates)
  // Using a 1200x600 coordinate system that represents the world map (zoomed out)
  // Increased dimensions to zoom out and ensure all regions are fully visible
  const initialPositions: Record<string, { x: number; y: number }> = {
    usa: { x: 240, y: 220 },      // North America, left-center - moved down
    europe: { x: 580, y: 190 },   // Europe, center-left - moved down
    china: { x: 900, y: 240 },    // China, right-center - moved down
    japan: { x: 980, y: 220 },    // Japan, far right, upper - moved down
    india: { x: 820, y: 290 },    // India, right-center, lower - moved down
  };

  const [regionPositions, setRegionPositions] = useState<Record<string, { x: number; y: number; fx?: number; fy?: number }>>(
    Object.fromEntries(
      Object.entries(initialPositions).map(([id, pos]) => [id, { ...pos }])
    )
  );

  const filteredFlows = flows.filter((flow) => flow.assetType === assetType);

  const getFlowColor = () => {
    switch (assetType) {
      case 'equities': return 'rgba(0, 255, 255, 0.6)';
      case 'bonds': return 'rgba(168, 85, 247, 0.6)';
      case 'currency': return 'rgba(52, 211, 153, 0.6)';
    }
  };

  // Get solid color for particles (no opacity)
  const getFlowColorSolid = () => {
    switch (assetType) {
      case 'equities': return 'rgb(0, 255, 255)'; // cyan
      case 'bonds': return 'rgb(168, 85, 247)'; // purple
      case 'currency': return 'rgb(52, 211, 153)'; // green
    }
  };

  // Get connected region IDs for a given region
  const getConnectedRegions = useCallback((regionId: string) => {
    const connected = new Set<string>();
    filteredFlows.forEach(flow => {
      if (flow.source === regionId) connected.add(flow.target);
      if (flow.target === regionId) connected.add(flow.source);
    });
    return Array.from(connected);
  }, [filteredFlows]);

  // Get region color based on stock change and flow state
  const getRegionColor = (region: RegionData) => {
    const baseColor = "rgb(6, 182, 212)"; // cyan base color
    const stockChange = region.stockChange;
    const stockChangeMagnitude = Math.abs(stockChange);
    const normalizedMagnitude = Math.min(stockChangeMagnitude / 10, 1); // Normalize to 0-1 (10% max)
    
    // Dynamic fill opacity based on stock change magnitude
    // Positive change = brighter (0.25 to 0.4), negative change = dimmer (0.15 to 0.2)
    let fillOpacity: number;
    let pulseColor: string;
    
    if (stockChange > 0) {
      // Positive change: increase opacity (0.25 to 0.4)
      fillOpacity = 0.25 + (normalizedMagnitude * 0.15);
      pulseColor = "rgba(34, 197, 94, 0.6)"; // Green pulse for positive change
    } else if (stockChange < 0) {
      // Negative change: decrease opacity (0.15 to 0.2)
      fillOpacity = 0.2 - (normalizedMagnitude * 0.05);
      fillOpacity = Math.max(0.1, fillOpacity);
      pulseColor = "rgba(239, 68, 68, 0.6)"; // Red pulse for negative change
    } else {
      fillOpacity = 0.2;
      pulseColor = "transparent";
    }
    
    return {
      fill: `rgba(6, 182, 212, ${fillOpacity})`,
      stroke: baseColor,
      pulseColor,
    };
  };

  // Check if flow should be highlighted (connected to hovered region)
  const isFlowHighlighted = (flow: GlobalFlow) => {
    if (highlightedRegions.size === 0) return false;
    return highlightedRegions.has(flow.source) || highlightedRegions.has(flow.target);
  };

  // Check if region should be highlighted
  const isRegionHighlighted = (regionId: string) => {
    if (highlightedRegions.size === 0) return true; // Show all if nothing hovered
    return highlightedRegions.has(regionId);
  };

  // Calculate curved edge endpoints
  const getCurvedEdgeEndpoints = (
    source: { x: number; y: number },
    target: { x: number; y: number },
    nodeRadius: number
  ) => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // If nodes are too close, return straight line endpoints
    if (distance < nodeRadius * 2) {
      return {
        x1: source.x,
        y1: source.y,
        x2: target.x,
        y2: target.y,
        controlX: (source.x + target.x) / 2,
        controlY: (source.y + target.y) / 2,
      };
    }
    
    // Calculate unit vector
    const ux = dx / distance;
    const uy = dy / distance;
    
    // Offset from node centers to avoid overlap
    const x1 = source.x + ux * nodeRadius;
    const y1 = source.y + uy * nodeRadius;
    const x2 = target.x - ux * nodeRadius;
    const y2 = target.y - uy * nodeRadius;
    
    // Calculate control point for curved edge (perpendicular offset)
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    // Curvature amount (perpendicular offset) - 15% of distance, max 200px
    const curvature = Math.min(distance * 0.15, 200);
    const controlX = midX + (-uy * curvature);
    const controlY = midY + (ux * curvature);
    
    return { x1, y1, x2, y2, controlX, controlY };
  };

  // Handle mouse move to detect hover over regions with improved accuracy
  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    
    const svg = svgRef.current;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    
    // Transform screen coordinates to SVG coordinates using the current transform matrix
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    
    const inverseCTM = ctm.inverse();
    const svgPt = pt.matrixTransform(inverseCTM);
    
    // Check if mouse is over any region
    let foundRegion: RegionData | null = null;
    const nodeRadius = 35; // Slightly larger radius for better hover detection
    
    for (const region of regions) {
      const pos = regionPositions[region.id];
      if (!pos) continue;
      
      const dx = svgPt.x - pos.x;
      const dy = svgPt.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance <= nodeRadius) {
        foundRegion = region;
        break;
      }
    }
    
    setHoveredRegion(foundRegion);
    
    // Highlight connected regions when hovering
    if (foundRegion) {
      const connected = getConnectedRegions(foundRegion.id);
      setHighlightedRegions(new Set([foundRegion.id, ...connected]));
    } else {
      setHighlightedRegions(new Set());
    }
  }, [regions, regionPositions, getConnectedRegions]);
  
  // Handle mouse leave to clear hover
  const handleMouseLeave = useCallback(() => {
    setHoveredRegion(null);
    setHighlightedRegions(new Set());
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full glass-card rounded-lg border border-border/50 overflow-hidden"
    >
      {/* Map Container */}
      <div className="w-full h-full">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid meet"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <marker
              id={`arrowhead-${assetType}`}
              markerWidth="4"
              markerHeight="4"
              refX="3"
              refY="1.5"
              orient="auto"
            >
              <polygon points="0 0, 4 1.5, 0 3" fill={getFlowColor()} />
            </marker>

            {/* Glow filter for high-intensity flows */}
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          {/* World Map Background - Ocean */}
          <rect x="0" y="0" width="1200" height="600" fill="rgba(15, 23, 42, 0.6)" />
          
          {/* Simple world map outline - continents (stylized) - scaled to match 1200x600 viewBox */}
          <g opacity="0.25" fill="rgba(100, 116, 139, 0.3)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="1.2">
            {/* North America - scaled by 1.2x */}
            <path d="M 120 96 Q 180 108 240 120 Q 300 132 360 156 Q 384 180 396 216 Q 402 252 390 288 Q 372 324 336 348 Q 288 372 240 384 Q 180 390 120 372 Q 72 348 60 312 Q 54 276 66 240 Q 84 204 108 168 Q 120 132 120 96 Z" />
            {/* South America - scaled by 1.2x */}
            <path d="M 336 336 Q 360 360 384 396 Q 408 432 420 468 Q 432 504 444 540 Q 456 564 480 576 Q 504 582 528 576 Q 552 564 576 540 Q 588 504 582 456 Q 570 408 552 372 Q 528 336 492 312 Q 456 294 420 288 Q 384 294 360 312 Z" />
            {/* Europe - scaled by 1.2x */}
            <path d="M 552 96 Q 600 102 660 108 Q 720 114 780 120 Q 840 126 900 132 Q 960 138 1020 144 Q 1176 168 1188 192 Q 1182 216 1164 240 Q 1140 264 1104 288 Q 1056 312 1008 336 Q 960 360 912 384 Q 864 408 816 432 Q 768 456 720 480 Q 672 504 624 528 Q 576 552 528 576 Q 480 588 432 576 Q 384 564 348 540 Q 312 516 288 492 Q 264 468 240 444 Q 216 420 192 396 Q 168 372 144 348 Q 120 324 96 300 Q 72 276 48 252 Q 24 228 12 204 Q 6 180 18 156 Q 30 132 54 114 Q 78 96 108 90 Q 240 90 360 90 Q 480 90 552 96 Z" />
            {/* Africa - scaled by 1.2x */}
            <path d="M 600 216 Q 624 240 648 276 Q 672 312 696 348 Q 720 384 744 420 Q 768 456 792 492 Q 816 528 840 564 Q 864 588 900 594 Q 936 600 972 594 Q 1008 582 1044 564 Q 1080 540 1116 516 Q 1152 492 1176 468 Q 1200 444 1200 420 Q 1194 396 1176 372 Q 1152 348 1128 324 Q 1104 300 1080 276 Q 1056 252 1032 228 Q 1008 204 984 180 Q 960 156 936 132 Q 912 108 888 90 Q 864 78 840 72 Q 816 70 792 74 Q 768 84 744 102 Q 720 120 696 144 Q 672 168 648 192 Z" />
            {/* Asia - scaled by 1.2x */}
            <path d="M 720 96 Q 780 102 840 108 Q 900 114 960 120 Q 1020 126 1080 132 Q 1140 138 1200 144 Q 1200 168 1194 192 Q 1182 216 1164 240 Q 1146 264 1128 288 Q 1110 312 1092 336 Q 1074 360 1056 384 Q 1038 408 1020 432 Q 1002 456 984 480 Q 966 504 948 528 Q 930 552 912 576 Q 894 594 876 600 Q 858 594 840 576 Q 822 552 804 528 Q 786 504 768 480 Q 750 456 732 432 Q 714 408 696 384 Q 678 360 660 336 Q 642 312 624 288 Q 606 264 588 240 Q 570 216 552 192 Q 534 168 516 144 Q 498 120 480 102 Q 462 90 252 96 Z" />
            {/* Australia - scaled by 1.2x */}
            <path d="M 912 408 Q 948 420 984 432 Q 1020 444 1056 456 Q 1092 468 1128 480 Q 1164 492 1188 504 Q 1200 528 1194 552 Q 1182 576 1164 594 Q 1140 600 1116 594 Q 1092 576 1068 552 Q 1044 528 1020 504 Q 996 480 972 456 Q 948 432 912 408 Z" />
          </g>

              {/* Flows */}
              {filteredFlows.map((flow, index) => {
                const source = regionPositions[flow.source];
                const target = regionPositions[flow.target];
                if (!source || !target) return null;

                // Calculate flow intensity (normalized amount for visual effects)
                const maxAmount = Math.max(...filteredFlows.map(f => f.amount), flow.amount);
                const flowIntensity = Math.min(1, flow.amount / (maxAmount * 0.5));
                
                // Variable thickness based on flow amount (more intuitive scaling)
                const minThickness = 2;
                const maxThickness = 10;
                const thickness = minThickness + (flowIntensity * (maxThickness - minThickness));
                const nodeRadius = 35;

                // Get curved edge endpoints
                const endpoints = getCurvedEdgeEndpoints(source, target, nodeRadius);
                
                // Check if flow should be highlighted
                const isHighlighted = isFlowHighlighted(flow);
                const flowOpacity = isHighlighted ? 1 : (highlightedRegions.size > 0 ? 0.2 : 0.6);

                const flowKey = `flow-${flow.source}-${flow.target}-${index}`;
                const pathId = `path-${flowKey}`;
                const gradientId = `gradient-${flowKey}`;
                
                // Animation duration based on flow intensity
                const animationDuration = Math.max(1.5, 4 - (flowIntensity * 2));
                const particleCount = Math.max(1, Math.floor(flowIntensity * 4));
                const isHighIntensity = flowIntensity > 0.6;

                // Create curved path string
                const pathString = `M ${endpoints.x1} ${endpoints.y1} Q ${endpoints.controlX} ${endpoints.controlY} ${endpoints.x2} ${endpoints.y2}`;

                return (
                  <g key={flowKey} className="pointer-events-none" opacity={flowOpacity}>
                    <defs>
                      {/* Gradient for flow line */}
                      <linearGradient id={gradientId} gradientUnits="userSpaceOnUse"
                        x1={endpoints.x1} y1={endpoints.y1}
                        x2={endpoints.x2} y2={endpoints.y2}>
                        <stop offset="0%" stopColor={getFlowColor()} stopOpacity="0.9" />
                        <stop offset="50%" stopColor={getFlowColor()} stopOpacity="0.7" />
                        <stop offset="100%" stopColor={getFlowColor()} stopOpacity="0.9" />
                      </linearGradient>
                    </defs>
                    
                    {/* Path for particles (curved) */}
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
                      strokeWidth={thickness}
                      fill="none"
                      markerEnd={`url(#arrowhead-${assetType})`}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter={isHighIntensity ? "url(#glow)" : undefined}
                      animate={{ 
                        strokeWidth: thickness,
                        opacity: Math.max(0.4, Math.min(1, 0.5 + flowIntensity * 0.5)),
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
                      strokeWidth={thickness * 0.6}
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

                    {/* Animated particles */}
                    {Array.from({ length: particleCount }).map((_, particleIndex) => {
                      const delay = (particleIndex / particleCount) * animationDuration;
                      const particleSize = 2 + (flowIntensity * 1.5);
                      
                      return (
                        <circle
                          key={`particle-${particleIndex}`}
                          r={particleSize}
                          fill={getFlowColorSolid()}
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

              {/* Regions */}
              {regions.map((region) => {
                const pos = regionPositions[region.id];
                if (!pos) return null;
                
                // Scale region circle based on stock index (larger = higher index)
                const baseRadius = 30;
                const scaleFactor = Math.min(1.5, Math.max(0.7, region.stockIndex / 4000));
                const radius = baseRadius * scaleFactor;
                
                // Get region color with dynamic opacity
                const regionColors = getRegionColor(region);
                const isHighlighted = isRegionHighlighted(region.id);
                const regionOpacity = isHighlighted ? 1 : (highlightedRegions.size > 0 ? 0.3 : 1);
                const hasSignificantChange = Math.abs(region.stockChange) > 3;
                const isHovered = hoveredRegion?.id === region.id;

                return (
                  <g key={region.id} opacity={regionOpacity}>
                    {/* Pulsing ring for regions with significant stock change */}
                    {hasSignificantChange && (
                      <motion.circle
                        cx={pos.x}
                        cy={pos.y}
                        r={radius + 15}
                        fill="none"
                        stroke={regionColors.pulseColor || regionColors.stroke}
                        strokeWidth={4}
                        className="pointer-events-none"
                        animate={{
                          r: [radius + 15, radius + 25, radius + 15],
                          opacity: [0.6, 0.2, 0.6],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                      />
                    )}

                    {/* Region shadow for depth */}
                    <circle
                      cx={pos.x + 3}
                      cy={pos.y + 3}
                      r={radius}
                      fill="rgba(0, 0, 0, 0.2)"
                      className="pointer-events-none"
                    />

                    {/* Main region circle */}
                    <motion.circle
                      cx={pos.x}
                      cy={pos.y}
                      r={radius}
                      fill={regionColors.fill}
                      stroke={regionColors.stroke}
                      strokeWidth={isHovered ? 8 : 6}
                      className="pointer-events-none"
                      style={{ 
                        filter: isHovered ? "drop-shadow(0 0 8px rgba(6, 182, 212, 0.5))" : "none" 
                      }}
                      animate={{ 
                        r: radius,
                        fill: regionColors.fill,
                        stroke: regionColors.stroke,
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
                      r={radius + 10}
                      fill="transparent"
                      className="cursor-pointer"
                      style={{ pointerEvents: 'all' }}
                      animate={{ r: radius + 10 }}
                      transition={{ duration: 0.6, ease: "easeInOut" }}
                    />

                    {/* Region label */}
                    <text
                      x={pos.x}
                      y={pos.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs font-bold pointer-events-none fill-foreground"
                      style={{ userSelect: 'none' }}
                    >
                      {region.name}
                    </text>

                    {/* Stock change percentage label */}
                    {Math.abs(region.stockChange) > 0.5 && (
                      <text
                        x={pos.x}
                        y={pos.y - radius - 20}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-semibold pointer-events-none"
                        style={{ 
                          userSelect: 'none', 
                          fontSize: '14px',
                          fill: region.stockChange > 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
                          textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)'
                        }}
                      >
                        {region.stockChange > 0 ? '+' : ''}{region.stockChange.toFixed(1)}%
                      </text>
                    )}
                  </g>
                );
              })}
        </svg>
      </div>

      {/* Region Tooltip - positioned accurately to the left of the node */}
      {hoveredRegion && (() => {
        const pos = regionPositions[hoveredRegion.id];
        if (!pos || !svgRef.current || !containerRef.current) return null;

        // Get the SVG element and container
        const svg = svgRef.current;
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        
        // Node radius in SVG coordinates
        const nodeRadius = 30;
        
        // Create SVG point for the node center
        const nodeCenterSVG = svg.createSVGPoint();
        nodeCenterSVG.x = pos.x;
        nodeCenterSVG.y = pos.y;
        
        // Get the current transform matrix
        const ctm = svg.getScreenCTM();
        if (!ctm) return null;
        
        // Convert node center from SVG coordinates to screen coordinates
        const nodeCenterScreen = nodeCenterSVG.matrixTransform(ctm);
        
        // Get tooltip dimensions (measured)
        const tooltipWidth = 180;
        const tooltipHeight = 100;
        const spacing = 12; // Space between node edge and tooltip
        
        // Calculate the node's left edge in screen coordinates
        // We need to account for the viewBox scaling
        const svgRect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        const scaleX = svgRect.width / viewBox.width;
        const scaleY = svgRect.height / viewBox.height;
        
        // Node left edge in screen coordinates
        const nodeLeftEdgeScreenX = nodeCenterScreen.x - (nodeRadius * scaleX);
        
        // Position tooltip to the left of the node's left edge
        let tooltipX = nodeLeftEdgeScreenX - tooltipWidth - spacing;
        
        // Position tooltip vertically centered on the node, but moved up significantly
        const verticalOffset = 80; // Move tooltip up by this amount
        let tooltipY = nodeCenterScreen.y - (tooltipHeight / 2) - verticalOffset;
        
        // Ensure tooltip stays within container bounds
        const padding = 10;
        
        // If tooltip goes off left edge, position it to the right of the node instead
        if (tooltipX < containerRect.left + padding) {
          const nodeRightEdgeScreenX = nodeCenterScreen.x + (nodeRadius * scaleX);
          tooltipX = nodeRightEdgeScreenX + spacing;
        }
        
        // Ensure tooltip doesn't go off right edge either
        if (tooltipX + tooltipWidth > containerRect.right - padding) {
          tooltipX = containerRect.right - tooltipWidth - padding;
        }
        
        // If tooltip goes above container, adjust it
        if (tooltipY < containerRect.top + padding) {
          tooltipY = containerRect.top + padding;
        }
        
        // If tooltip would go off bottom, adjust it
        if (tooltipY + tooltipHeight > containerRect.bottom - padding) {
          tooltipY = containerRect.bottom - tooltipHeight - padding;
        }

        // Calculate total flows for this region
        const regionFlows = filteredFlows.filter(
          (flow) => flow.source === hoveredRegion.id || flow.target === hoveredRegion.id
        );

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
            <div className="text-sm font-semibold text-foreground mb-1">{hoveredRegion.name}</div>
            <div className="text-xs text-muted-foreground">
              Stock Index: <span className="font-semibold text-foreground">
                {hoveredRegion.stockIndex.toFixed(2)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Change: <span className={hoveredRegion.stockChange > 0 ? "text-cyan-500" : "text-purple-500"}>
                {hoveredRegion.stockChange > 0 ? "+" : ""}{hoveredRegion.stockChange.toFixed(2)}%
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              Active Flows: <span className="font-semibold text-foreground">{regionFlows.length}</span>
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
};
