import { motion } from "framer-motion";
import { AssetNode, FlowEdge } from "@/types";
import { useState } from "react";

interface NetworkGraphProps {
  nodes: AssetNode[];
  edges: FlowEdge[];
}

export const NetworkGraph = ({ nodes, edges }: NetworkGraphProps) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const positions: Record<string, { x: number; y: number }> = {
    stocks: { x: 50, y: 30 },
    bonds: { x: 20, y: 70 },
    commodities: { x: 80, y: 60 },
    crypto: { x: 50, y: 90 },
    cash: { x: 85, y: 20 },
  };

  const getNodeSize = (marketCap: number) => {
    const minSize = 60;
    const maxSize = 120;
    const normalized = Math.log(marketCap) / Math.log(128000000000000);
    return minSize + (maxSize - minSize) * normalized;
  };

  const getEdgeColor = (correlation: number) => {
    if (correlation > 0) {
      return `rgba(0, 255, 255, ${Math.abs(correlation)})`;
    }
    return `rgba(168, 85, 247, ${Math.abs(correlation)})`;
  };

  return (
    <div className="relative w-full h-[600px] glass-card rounded-lg border border-border/50 overflow-hidden">
      <svg className="w-full h-full">
        {edges.map((edge, index) => {
          const source = positions[edge.source];
          const target = positions[edge.target];
          if (!source || !target) return null;

          return (
            <motion.line
              key={`${edge.source}-${edge.target}`}
              x1={`${source.x}%`}
              y1={`${source.y}%`}
              x2={`${target.x}%`}
              y2={`${target.y}%`}
              stroke={getEdgeColor(edge.correlation)}
              strokeWidth={Math.abs(edge.correlation) * 4}
              strokeOpacity={0.6}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: index * 0.1 }}
            />
          );
        })}
      </svg>

      {nodes.map((node) => {
        const pos = positions[node.id];
        if (!pos) return null;
        const size = getNodeSize(node.marketCap);

        return (
          <motion.div
            key={node.id}
            className="absolute cursor-pointer"
            style={{
              left: `calc(${pos.x}% - ${size / 2}px)`,
              top: `calc(${pos.y}% - ${size / 2}px)`,
              width: size,
              height: size,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            whileHover={{ scale: 1.1 }}
            onHoverStart={() => setHoveredNode(node.id)}
            onHoverEnd={() => setHoveredNode(null)}
          >
            <div
              className={`w-full h-full rounded-full flex items-center justify-center border-2 ${
                node.priceChange > 0
                  ? "bg-primary/20 border-primary border-glow-cyan"
                  : "bg-secondary/20 border-secondary border-glow-purple"
              }`}
            >
              <span className="text-xs font-bold text-center">{node.name}</span>
            </div>

            {hoveredNode === node.id && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-10 glass-card p-3 rounded-lg border border-border/50 whitespace-nowrap"
              >
                <div className="text-sm font-semibold text-foreground">{node.name}</div>
                <div className="text-xs text-muted-foreground">
                  Avg Corr: {node.correlation.toFixed(2)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Price Δ: {node.priceChange > 0 ? "+" : ""}
                  {node.priceChange.toFixed(2)}%
                </div>
                <div className="text-xs text-muted-foreground">
                  Market Cap: ${(node.marketCap / 1e12).toFixed(2)}T
                </div>
              </motion.div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};
