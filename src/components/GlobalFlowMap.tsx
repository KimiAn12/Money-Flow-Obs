import { motion } from "framer-motion";
import { GlobalFlow, RegionData } from "@/types";
import { useState } from "react";

interface GlobalFlowMapProps {
  regions: RegionData[];
  flows: GlobalFlow[];
  assetType: 'equities' | 'bonds' | 'currency';
}

export const GlobalFlowMap = ({ regions, flows, assetType }: GlobalFlowMapProps) => {
  const [hoveredFlow, setHoveredFlow] = useState<GlobalFlow | null>(null);

  const regionPositions: Record<string, { x: number; y: number }> = {
    usa: { x: 25, y: 40 },
    europe: { x: 50, y: 30 },
    china: { x: 70, y: 40 },
    japan: { x: 75, y: 35 },
    india: { x: 65, y: 50 },
  };

  const filteredFlows = flows.filter((flow) => flow.assetType === assetType);

  const getFlowColor = () => {
    switch (assetType) {
      case 'equities': return 'rgba(0, 255, 255, 0.6)';
      case 'bonds': return 'rgba(168, 85, 247, 0.6)';
      case 'currency': return 'rgba(52, 211, 153, 0.6)';
    }
  };

  return (
    <div className="relative w-full h-[500px] glass-card rounded-lg border border-border/50 overflow-hidden">
      <svg className="w-full h-full">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 10 3, 0 6" fill={getFlowColor()} />
          </marker>
        </defs>

        {filteredFlows.map((flow, index) => {
          const source = regionPositions[flow.source];
          const target = regionPositions[flow.target];
          if (!source || !target) return null;

          const thickness = Math.log(flow.amount) / 3;

          return (
            <motion.line
              key={`${flow.source}-${flow.target}-${index}`}
              x1={`${source.x}%`}
              y1={`${source.y}%`}
              x2={`${target.x}%`}
              y2={`${target.y}%`}
              stroke={getFlowColor()}
              strokeWidth={thickness}
              markerEnd="url(#arrowhead)"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, delay: index * 0.2 }}
              onHoverStart={() => setHoveredFlow(flow)}
              onHoverEnd={() => setHoveredFlow(null)}
              className="cursor-pointer"
            />
          );
        })}
      </svg>

      {regions.map((region) => {
        const pos = regionPositions[region.id];
        if (!pos) return null;

        return (
          <motion.div
            key={region.id}
            className="absolute"
            style={{
              left: `calc(${pos.x}% - 30px)`,
              top: `calc(${pos.y}% - 30px)`,
              width: 60,
              height: 60,
            }}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.3 }}
          >
            <div className="w-full h-full rounded-full bg-primary/20 border-2 border-primary border-glow-cyan flex items-center justify-center">
              <span className="text-xs font-bold text-center">{region.name}</span>
            </div>
          </motion.div>
        );
      })}

      {hoveredFlow && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute top-4 right-4 glass-card p-3 rounded-lg border border-border/50"
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
      )}
    </div>
  );
};
