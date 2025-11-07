import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

interface AIInsightsPanelProps {
  insights: string[];
}

export const AIInsightsPanel = ({ insights }: AIInsightsPanelProps) => {
  const [visibleInsights, setVisibleInsights] = useState<string[]>([]);

  useEffect(() => {
    setVisibleInsights([]);
    insights.forEach((insight, index) => {
      setTimeout(() => {
        setVisibleInsights((prev) => [...prev, insight]);
      }, index * 800);
    });
  }, [insights]);

  return (
    <div className="glass-card p-6 rounded-lg border border-border/50 h-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-5 h-5 text-secondary" />
        <h3 className="text-lg font-semibold glow-purple">AI Insights</h3>
      </div>
      
      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-12rem)]">
        {visibleInsights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="p-3 rounded-lg bg-muted/30 border border-border/30 text-sm text-muted-foreground"
          >
            <span className="text-secondary font-medium">• </span>
            {insight}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
