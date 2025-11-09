import { useState, useEffect, useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { NetworkGraph } from "@/components/NetworkGraph";
import { usePlayAnimation } from "@/hooks/usePlayAnimation";
import { generateAnimationSnapshots } from "@/utils/animationUtils";
import { TimeRange, IndustryFlowData } from "@/types";
import industryFlowData from "@/data/industry-flow.json";

// Read from static file in public/data/ (updated daily by script)
const DATA_URL = "/data/industry-flow.json";

export default function IndustryFlow() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [data, setData] = useState<IndustryFlowData>(industryFlowData as IndustryFlowData);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Animation state
  const [animationStep, setAnimationStep] = useState<number | null>(null);
  const animationSnapshotsRef = useRef<IndustryFlowData[]>([]);
  
  // Generate animation snapshots when data or timeRange changes
  const animationSnapshots = useMemo(() => {
    return generateAnimationSnapshots(data, timeRange);
  }, [data, timeRange]);
  
  // Store snapshots in ref for animation hook
  useEffect(() => {
    animationSnapshotsRef.current = animationSnapshots;
  }, [animationSnapshots]);
  
  // Animation hook
  const animation = usePlayAnimation({
    totalSteps: animationSnapshots.length,
    duration: 3000, // 3 seconds
    onStepChange: (step) => {
      setAnimationStep(step);
    },
    onComplete: () => {
      setAnimationStep(null);
    },
  });
  
  // Get current data (animated or static)
  const currentData = useMemo(() => {
    if (animationStep !== null && animationSnapshots[animationStep]) {
      return animationSnapshots[animationStep];
    }
    return data;
  }, [animationStep, animationSnapshots, data]);

  const fetchData = async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      
      // Try to fetch from static file in public/data/
      const response = await fetch(DATA_URL);
      
      if (!response.ok) {
        throw new Error(`Failed to load data: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Error loading industry flow data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      // Fall back to local data in src/data/ on error
      setData(industryFlowData as IndustryFlowData);
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch once on mount, timeRange is not used for API calls

  const handleRefresh = () => {
    // Reload data from static file
    fetchData();
  };
  
  const handlePlay = () => {
    animation.play();
  };


  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full flex flex-col p-4"
      >
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold glow-cyan mb-0.5">Industry Flow Dashboard</h1>
            <p className="text-xs text-muted-foreground">
              Real-time capital flow visualization across asset classes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <TimeRangeSelector selected={timeRange} onSelect={setTimeRange} />
            <Button
              onClick={handlePlay}
              disabled={animation.isPlaying}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              {animation.isPlaying ? "Animating..." : "Play Animation"}
            </Button>
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0 overflow-hidden">
          {/* Graph - Left Side (2/3 width) */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 h-full min-h-0 overflow-hidden"
          >
            <NetworkGraph nodes={currentData.nodes} edges={currentData.edges} />
          </motion.div>

          {/* Information Panel - Right Side (1/3 width) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-1 h-full flex flex-col gap-2 min-h-0 overflow-hidden"
          >
            <div className="flex-1 min-h-0 overflow-y-auto pr-1">
              <div className="glass-card p-3 rounded-lg border border-border/50 flex-shrink-0 mb-2">
                <h2 className="text-base font-semibold mb-2">Asset Classes</h2>
                <div className="space-y-1.5">
                  {currentData.nodes.map((node) => (
                    <div
                      key={node.id}
                      className={`p-2 rounded-lg border transition-all ${
                        node.netFlowPct > 0
                          ? "border-cyan-500/50 hover:border-cyan-500 bg-cyan-500/5"
                          : "border-purple-500/50 hover:border-purple-500 bg-purple-500/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="font-semibold text-sm">{node.id}</div>
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
                  className="p-2 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-xs mb-2"
                >
                  ⚠️ {error} (Using cached data)
                </motion.div>
              )}
            </div>
            
            <div className="text-xs text-center text-muted-foreground flex-shrink-0 pt-1 border-t border-border/30">
              {isLoading ? "Loading..." : animation.isPlaying 
                ? `Animating: ${timeRange} timeframe...`
                : `Last updated: ${new Date(currentData.timestamp).toLocaleString()}`}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
