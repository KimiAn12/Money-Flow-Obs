import { useState } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobalFlowMap } from "@/components/GlobalFlowMap";
import { RegionCard } from "@/components/RegionCard";
import { AssetType, GlobalFlowData } from "@/types";
import globalFlowData from "@/data/global-flow.json";

export default function GlobalMarkets() {
  const [data] = useState<GlobalFlowData>(globalFlowData as GlobalFlowData);
  const [assetType, setAssetType] = useState<AssetType>('equities');

  return (
    <div className="min-h-screen bg-background p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto"
      >
        <h1 className="text-3xl font-bold glow-purple mb-6">Global Market Flow</h1>

        <Tabs value={assetType} onValueChange={(value) => setAssetType(value as AssetType)}>
          <TabsList className="glass-card border border-border/50 mb-6">
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

          <TabsContent value={assetType}>
            <div className="mb-6">
              <GlobalFlowMap
                regions={data.regions}
                flows={data.flows}
                assetType={assetType}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {data.regions.map((region, index) => (
                <RegionCard key={region.id} region={region} index={index} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

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
