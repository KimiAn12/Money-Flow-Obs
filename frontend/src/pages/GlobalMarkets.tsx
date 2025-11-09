import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeRangeSelector } from "@/components/TimeRangeSelector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalFlowMap } from "@/components/GlobalFlowMap";
import { RegionCard } from "@/components/RegionCard";
import { AssetType, GlobalFlowData, TimeRange } from "@/types";
import globalFlowData from "@/data/global-flow.json";

// Read from static file in public/data/ (updated daily by script)
const DATA_URL = "/data/global-flow.json";

export default function GlobalMarkets() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M');
  const [data, setData] = useState<GlobalFlowData>(globalFlowData as GlobalFlowData);
  const [assetType, setAssetType] = useState<AssetType>('equities');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      console.error("Error loading global flow data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
      // Fall back to local data in src/data/ on error
      setData(globalFlowData as GlobalFlowData);
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

  const filteredFlows = data.flows.filter((flow) => flow.assetType === assetType);
  const totalFlow = filteredFlows.reduce((sum, flow) => sum + flow.amount, 0);

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full flex flex-col p-4"
      >
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold glow-purple mb-0.5">Global Market Flow</h1>
            <p className="text-xs text-muted-foreground">
              Real-time capital flow visualization across global markets
            </p>
          </div>
          <div className="flex items-center gap-3">
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

        <Tabs value={assetType} onValueChange={(value) => setAssetType(value as AssetType)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <TabsList className="glass-card border border-border/50 mb-3 flex-shrink-0">
            <TabsTrigger value="equities" className="data-[state=active]:border-glow-cyan">
              Equities
            </TabsTrigger>
            <TabsTrigger value="bonds" className="data-[state=active]:border-glow-purple">
              Bonds
            </TabsTrigger>
            <TabsTrigger value="currency" className="data-[state=active]:border-glow-cyan">
              Currency
            </TabsTrigger>
          </TabsList>

          <TabsContent value={assetType} className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {/* Main Content: Graph on Left, Info on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 flex-1 min-h-0 overflow-hidden">
              {/* Graph - Left Side (2/3 width) */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 h-full min-h-0 overflow-hidden"
              >
                <GlobalFlowMap
                  regions={data.regions}
                  flows={data.flows}
                  assetType={assetType}
                />
              </motion.div>

              {/* Information Panel - Right Side (1/3 width) */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="lg:col-span-1 h-full flex flex-col gap-2 min-h-0 overflow-hidden"
              >
                <div className="flex-1 min-h-0 overflow-y-auto pr-1">
                  <div className="glass-card p-3 rounded-lg border border-border/50 flex-shrink-0 mb-2">
                    <h2 className="text-base font-semibold mb-2">Flow Summary</h2>
                    <div className="space-y-1.5">
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Total Flow</div>
                        <div className="text-lg font-bold">${(totalFlow / 1e9).toFixed(2)}B</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Active Flows</div>
                        <div className="text-lg font-bold">{filteredFlows.length}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-0.5">Asset Type</div>
                        <div className="text-sm font-semibold capitalize">{assetType}</div>
                      </div>
                    </div>
                  </div>

                  <div className="glass-card p-3 rounded-lg border border-border/50 flex-shrink-0 mb-2">
                    <h2 className="text-base font-semibold mb-2">Regions</h2>
                    <div className="space-y-1.5">
                      {data.regions.map((region) => (
                        <div
                          key={region.id}
                          className="p-2 rounded-lg border border-border/30 hover:border-primary/50 transition-all"
                        >
                          <div className="font-semibold text-xs">{region.name}</div>
                          <div className="text-xs text-muted-foreground">
                            Index: {region.stockIndex.toFixed(2)} ({region.stockChange > 0 ? "+" : ""}{region.stockChange.toFixed(2)}%)
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
                  {isLoading ? "Loading..." : `Last updated: ${new Date(data.timestamp).toLocaleString()}`}
                </div>
              </motion.div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
