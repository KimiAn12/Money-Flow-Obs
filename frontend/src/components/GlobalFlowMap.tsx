import { motion } from "framer-motion";
import { GlobalFlow, RegionData } from "@/types";
import { useState, useRef } from "react";

interface GlobalFlowMapProps {
  regions: RegionData[];
  flows: GlobalFlow[];
  assetType: 'equities' | 'bonds' | 'currency';
}

export const GlobalFlowMap = ({ regions, flows, assetType }: GlobalFlowMapProps) => {
  const [hoveredFlow, setHoveredFlow] = useState<GlobalFlow | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Geographic positions on world map (percentage-based, then scaled to SVG coordinates)
  // Using a 1000x500 coordinate system that represents the world map
  const initialPositions: Record<string, { x: number; y: number }> = {
    usa: { x: 200, y: 180 },      // North America, left-center
    europe: { x: 480, y: 150 },   // Europe, center-left
    china: { x: 750, y: 200 },    // China, right-center
    japan: { x: 820, y: 180 },    // Japan, far right, upper
    india: { x: 680, y: 240 },    // India, right-center, lower
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

  return (
    <div className="relative w-full h-full glass-card rounded-lg border border-border/50 overflow-hidden">
      {/* Map Container */}
      <div className="w-full h-full">
        <svg
          ref={svgRef}
          className="w-full h-full"
          viewBox="0 0 1000 500"
          preserveAspectRatio="xMidYMid meet"
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
          </defs>

          {/* World Map Background - Ocean */}
          <rect x="0" y="0" width="1000" height="500" fill="rgba(15, 23, 42, 0.6)" />
          
          {/* Simple world map outline - continents (stylized) */}
          <g opacity="0.25" fill="rgba(100, 116, 139, 0.3)" stroke="rgba(148, 163, 184, 0.5)" strokeWidth="1">
            {/* North America */}
            <path d="M 100 80 Q 150 90 200 100 Q 250 110 300 130 Q 320 150 330 180 Q 335 210 325 240 Q 310 270 280 290 Q 240 310 200 320 Q 150 325 100 310 Q 60 290 50 260 Q 45 230 55 200 Q 70 170 90 140 Q 100 110 100 80 Z" />
            {/* South America */}
            <path d="M 280 280 Q 300 300 320 330 Q 340 360 350 390 Q 360 420 370 450 Q 380 470 400 480 Q 420 485 440 480 Q 460 470 480 450 Q 490 420 485 380 Q 475 340 460 310 Q 440 280 410 260 Q 380 245 350 240 Q 320 245 300 260 Z" />
            {/* Europe */}
            <path d="M 460 80 Q 500 85 550 90 Q 600 95 650 100 Q 700 105 750 110 Q 800 115 850 120 Q 900 125 950 130 Q 980 140 990 160 Q 985 180 970 200 Q 950 220 920 240 Q 880 260 840 280 Q 800 300 760 320 Q 720 340 680 360 Q 640 380 600 400 Q 560 420 520 440 Q 480 460 440 480 Q 400 490 360 480 Q 320 470 290 450 Q 260 430 240 410 Q 220 390 200 370 Q 180 350 160 330 Q 140 310 120 290 Q 100 270 80 250 Q 60 230 40 210 Q 20 190 10 170 Q 5 150 15 130 Q 25 110 45 95 Q 65 80 90 75 Q 200 75 300 75 Q 400 75 460 80 Z" />
            {/* Africa */}
            <path d="M 500 180 Q 520 200 540 230 Q 560 260 580 290 Q 600 320 620 350 Q 640 380 660 410 Q 680 440 700 470 Q 720 490 750 495 Q 780 500 810 495 Q 840 485 870 470 Q 900 450 930 430 Q 960 410 980 390 Q 1000 370 1000 350 Q 995 330 980 310 Q 960 290 940 270 Q 920 250 900 230 Q 880 210 860 190 Q 840 170 820 150 Q 800 130 780 110 Q 760 90 740 75 Q 720 65 700 60 Q 680 58 660 62 Q 640 70 620 85 Q 600 100 580 120 Q 560 140 540 160 Z" />
            {/* Asia */}
            <path d="M 600 80 Q 650 85 700 90 Q 750 95 800 100 Q 850 105 900 110 Q 950 115 1000 120 Q 1000 140 995 160 Q 985 180 970 200 Q 950 220 930 240 Q 910 260 890 280 Q 870 300 850 320 Q 830 340 810 360 Q 790 380 770 400 Q 750 420 730 440 Q 710 460 690 480 Q 670 495 650 500 Q 630 495 610 480 Q 590 460 570 440 Q 550 420 530 400 Q 510 380 490 360 Q 470 340 450 320 Q 430 300 410 280 Q 390 260 370 240 Q 350 220 330 200 Q 310 180 290 160 Q 270 140 250 120 Q 230 100 210 85 Q 190 75 400 80 Z" />
            {/* Australia */}
            <path d="M 760 340 Q 790 350 820 360 Q 850 370 880 380 Q 910 390 940 400 Q 970 410 990 420 Q 1000 440 995 460 Q 985 480 970 495 Q 950 500 930 495 Q 910 480 890 460 Q 870 440 850 420 Q 830 400 810 380 Q 790 360 760 340 Z" />
          </g>

          {/* Flows */}
          {filteredFlows.map((flow, index) => {
            const source = regionPositions[flow.source];
            const target = regionPositions[flow.target];
            if (!source || !target) return null;

            const thickness = Math.max(1, Math.log(flow.amount) / 4);
            const nodeRadius = 30;

            // Calculate the angle from source to target
            const dx = target.x - source.x;
            const dy = target.y - source.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If nodes are too close, skip this flow
            if (distance < nodeRadius * 2) return null;
            
            // Calculate unit vector
            const unitX = dx / distance;
            const unitY = dy / distance;
            
            // Calculate edge points on circles
            const sourceEdgeX = source.x + nodeRadius * unitX;
            const sourceEdgeY = source.y + nodeRadius * unitY;
            const targetEdgeX = target.x - nodeRadius * unitX;
            const targetEdgeY = target.y - nodeRadius * unitY;

            return (
              <motion.line
                key={`${flow.source}-${flow.target}-${index}`}
                x1={sourceEdgeX}
                y1={sourceEdgeY}
                x2={targetEdgeX}
                y2={targetEdgeY}
                stroke={getFlowColor()}
                strokeWidth={thickness}
                markerEnd={`url(#arrowhead-${assetType})`}
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, delay: index * 0.2 }}
                onMouseEnter={() => setHoveredFlow(flow)}
                onMouseLeave={() => setHoveredFlow(null)}
                className="cursor-pointer"
              />
            );
          })}

          {/* Regions */}
          {regions.map((region) => {
            const pos = regionPositions[region.id];
            if (!pos) return null;

            return (
              <g key={region.id}>
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={30}
                  fill="rgba(6, 182, 212, 0.2)"
                  stroke="rgb(6, 182, 212)"
                  strokeWidth={2}
                  className="pointer-events-none"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.3 }}
                />
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={30}
                  fill="transparent"
                  className="cursor-pointer"
                  style={{ pointerEvents: 'all' }}
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
                  {region.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Flow Tooltip */}
      {hoveredFlow && (() => {
        const sourcePos = regionPositions[hoveredFlow.source];
        const targetPos = regionPositions[hoveredFlow.target];
        if (!sourcePos || !targetPos) return null;
        const midX = (sourcePos.x + targetPos.x) / 2;
        const midY = (sourcePos.y + targetPos.y) / 2;
        // Convert SVG coordinates (0-1000, 0-500) to percentage
        const xPercent = (midX / 1000) * 100;
        const yPercent = (midY / 500) * 100;

        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute z-30 glass-card p-3 rounded-lg border border-border/50 shadow-lg pointer-events-none"
            style={{
              left: `${xPercent}%`,
              top: `${yPercent}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="text-sm font-semibold text-foreground">
              {regions.find((r) => r.id === hoveredFlow.source)?.name} →{" "}
              {regions.find((r) => r.id === hoveredFlow.target)?.name}
            </div>
            <div className="text-xs text-muted-foreground">
              Flow: ${(hoveredFlow.amount / 1e9).toFixed(2)}B
            </div>
            <div className="text-xs text-muted-foreground capitalize">
              Type: {hoveredFlow.assetType}
            </div>
          </motion.div>
        );
      })()}
    </div>
  );
};
