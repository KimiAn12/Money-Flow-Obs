import { motion } from "framer-motion";
import { RegionData } from "@/types";
import { TrendingUp, TrendingDown } from "lucide-react";

interface RegionCardProps {
  region: RegionData;
  index: number;
}

export const RegionCard = ({ region, index }: RegionCardProps) => {
  const isPositive = region.stockChange > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="glass-card p-4 rounded-lg border border-border/50 hover:border-primary/50 transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-lg font-semibold text-foreground">{region.name}</h3>
        <div className={`flex items-center gap-1 ${isPositive ? "text-primary" : "text-secondary"}`}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span className="text-sm font-medium">
            {isPositive ? "+" : ""}
            {region.stockChange.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Stock Index</span>
          <span className="font-medium text-foreground">{region.stockIndex.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Currency ({region.currency})</span>
          <span className="font-medium text-foreground">{region.currencyStrength.toFixed(2)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Bond Yield</span>
          <span className="font-medium text-foreground">{region.bondYield.toFixed(2)}%</span>
        </div>
      </div>
    </motion.div>
  );
};
