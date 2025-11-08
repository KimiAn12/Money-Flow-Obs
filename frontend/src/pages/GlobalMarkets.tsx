import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalFlowMap } from "@/components/GlobalFlowMap";
import { RegionCard } from "@/components/RegionCard";
import { AssetType, GlobalFlowData } from "@/types";
import globalFlowData from "@/data/global-flow.json";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8001";

export default function GlobalMarkets() {
  const [data, setData] = useState<GlobalFlowData>(globalFlowData as GlobalFlowData);
  const [assetType, setAssetType] = useState<AssetType>('equities');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/global-flow`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch data: ${response.statusText}`);
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        console.error("Error fetching global flow data:", err);
        setError(err instanceof Error ? err.message : "Failed to load data");
        // Fall back to local data on error
        setData(globalFlowData as GlobalFlowData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredFlows = data.flows.filter((flow) => flow.assetType === assetType);
  const totalFlow = filteredFlows.reduce((sum, flow) => sum + flow.amount, 0);

  return (
    <div className="h-full bg-background overflow-hidden flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col p-6 min-h-0"
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold glow-purple mb-1">Global Market Flow</h1>
            <p className="text-xs text-muted-foreground">
              Hover over regions and flows for details
            </p>
          </div>
        </div>

        <Tabs value={assetType} onValueChange={(value) => setAssetType(value as AssetType)} className="flex-1 flex flex-col min-h-0">
          <TabsList className="glass-card border border-border/50 mb-4">
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

          <TabsContent value={assetType} className="flex-1 min-h-0 flex flex-col">
            {/* Main Content: Graph on Left, Info on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
              {/* Graph - Left Side (2/3 width) */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="lg:col-span-2 min-h-0"
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
                className="lg:col-span-1 flex flex-col gap-3 min-h-0 overflow-y-auto"
              >
                <div className="glass-card p-4 rounded-lg border border-border/50 flex-shrink-0">
                  <h2 className="text-lg font-semibold mb-3">Flow Summary</h2>
                  <div className="space-y-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Total Flow</div>
                      <div className="text-xl font-bold">${(totalFlow / 1e9).toFixed(2)}B</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Active Flows</div>
                      <div className="text-xl font-bold">{filteredFlows.length}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Asset Type</div>
                      <div className="text-base font-semibold capitalize">{assetType}</div>
                    </div>
                  </div>
                </div>

                <div className="glass-card p-4 rounded-lg border border-border/50 flex-shrink-0">
                  <h2 className="text-lg font-semibold mb-3">Regions</h2>
                  <div className="space-y-2">
                    {data.regions.map((region) => (
                      <div
                        key={region.id}
                        className="p-2 rounded-lg border border-border/30 hover:border-primary/50 transition-all"
                      >
                        <div className="font-semibold text-sm">{region.name}</div>
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
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
