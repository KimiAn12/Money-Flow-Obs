import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { MetricSelector } from "@/components/MetricSelector";
import { NetworkGraph } from "@/components/NetworkGraph";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { TimeRange, FlowMetric, IndustryFlowData } from "@/types";
import industryFlowData from "@/data/industry-flow.json";

export default function IndustryFlow() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [metric, setMetric] = useState<FlowMetric>('correlation');
  const [data, setData] = useState<IndustryFlowData>(industryFlowData);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setData({ ...industryFlowData, timestamp: new Date().toISOString() });
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold glow-cyan">Industry Flow Dashboard</h1>
          <div className="flex items-center gap-4">
            <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />
            <MetricSelector selected={metric} onSelect={setMetric} />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="border-border/50 glass-card"
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </motion.div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <NetworkGraph nodes={data.nodes} edges={data.edges} />
          </div>
          <div className="lg:col-span-1">
            <AIInsightsPanel insights={data.insights} />
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-sm text-muted-foreground"
        >
          Last updated: {new Date(data.timestamp).toLocaleString()}
        </motion.div>
      </motion.div>
    </div>
  );
}
