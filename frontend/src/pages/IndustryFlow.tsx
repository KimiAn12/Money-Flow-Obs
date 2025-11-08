import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { NetworkGraph } from "@/components/NetworkGraph";
import { TimeRange, IndustryFlowData } from "@/types";
import industryFlowData from "@/data/industry-flow.json";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

export default function IndustryFlow() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [data, setData] = useState<IndustryFlowData>(industryFlowData as IndustryFlowData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (refresh = false) => {
    try {
      setIsRefreshing(true);
      setError(null);
      const response = await fetch(
        `${API_BASE_URL}/api/industry-flow?timeRange=${timeRange}&refresh=${refresh}`
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error fetching industry flow data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      // Fall back to local data on error
      setData(industryFlowData as IndustryFlowData);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const handleRefresh = () => {
    fetchData(true);
  };


  return (
    <div className="h-full bg-background overflow-hidden flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col p-6 min-h-0"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold glow-cyan mb-1">Industry Flow Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Real-time capital flow visualization across asset classes
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Hover over nodes for details
            </p>
          </div>
          <div className="flex items-center gap-4">
            <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={handleRefresh}
                variant="outline"
                className="border-border/50 glass-card"
                disabled={isRefreshing}
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Main Content: Graph on Left, Info on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
          {/* Graph - Left Side (2/3 width) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 min-h-0"
          >
            <NetworkGraph nodes={data.nodes} edges={data.edges} />
          </motion.div>

          {/* Information Panel - Right Side (1/3 width) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1 flex flex-col gap-3 min-h-0 overflow-y-auto"
          >
            <div className="glass-card p-4 rounded-lg border border-border/50 flex-shrink-0">
              <h2 className="text-lg font-semibold mb-3">Asset Classes</h2>
              <div className="space-y-2">
                {data.nodes.map((node) => (
                  <div
                    key={node.id}
                    className={`p-3 rounded-lg border transition-all ${
                      node.netFlowPct > 0
                        ? "border-cyan-500/50 hover:border-cyan-500 bg-cyan-500/5"
                        : "border-purple-500/50 hover:border-purple-500 bg-purple-500/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-base">{node.id}</div>
                      <span className={`text-xs font-bold ${node.netFlowPct > 0 ? "text-cyan-500" : "text-purple-500"}`}>
                        {node.netFlowPct > 0 ? "+" : ""}{node.netFlowPct.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div>Size: {node.size.toFixed(3)}</div>
                      <div>Market Cap: ${(node.marketCap / 1000).toFixed(1)}B</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs"
              >
                ⚠️ {error} (Using cached data)
              </motion.div>
            )}
            
            <div className="text-xs text-center text-muted-foreground flex-shrink-0">
              {isLoading ? "Loading..." : `Last updated: ${new Date(data.timestamp).toLocaleString()}`}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
