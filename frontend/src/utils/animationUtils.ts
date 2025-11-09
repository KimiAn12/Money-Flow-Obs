import { GlobalFlowData, IndustryFlowData, RegionData, AssetNode, FlowEdge, GlobalFlow } from "@/types";

/**
 * Generate time-series snapshots for animation
 * Creates data points from beginning to end of timeframe
 */
export function generateAnimationSnapshots<T extends GlobalFlowData | IndustryFlowData>(
  baseData: T,
  timeframe: '1D' | '1W' | '1M' | '3M' | '1Y'
): T[] {
  const days = timeframe === '1D' ? 1 : timeframe === '1W' ? 7 : timeframe === '1M' ? 30 : timeframe === '3M' ? 90 : 365;
  const snapshots: T[] = [];
  
  // Generate snapshots going backwards in time, then reverse to go forward
  for (let i = 0; i <= days; i++) {
    const progress = i / days; // 0 to 1
    
    if ('regions' in baseData && 'flows' in baseData) {
      // GlobalFlowData
      const globalData = baseData as GlobalFlowData;
      snapshots.push({
        ...globalData,
        timestamp: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString(),
        regions: generateAnimatedRegions(globalData.regions, progress),
        flows: generateAnimatedFlows(globalData.flows, progress),
      } as T);
    } else if ('nodes' in baseData && 'edges' in baseData) {
      // IndustryFlowData
      const industryData = baseData as IndustryFlowData;
      snapshots.push({
        ...industryData,
        timestamp: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString(),
        nodes: generateAnimatedNodes(industryData.nodes, progress),
        edges: generateAnimatedEdges(industryData.edges, progress),
      } as T);
    }
  }
  
  return snapshots;
}

/**
 * Generate animated region data - starts small/growing, ends at current values
 */
function generateAnimatedRegions(regions: RegionData[], progress: number): RegionData[] {
  // Smooth easing function for natural progression
  // Ease-in-out cubic for smooth acceleration and deceleration
  const easedProgress = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  
  return regions.map((region) => {
    // Start from 60% of current value, grow to 100%
    // This creates a visual "growth" effect over time
    const startMultiplier = 0.6;
    const currentMultiplier = startMultiplier + (1 - startMultiplier) * easedProgress;
    
    // Stock index grows from smaller to current value
    const animatedStockIndex = region.stockIndex * currentMultiplier;
    
    // Stock change oscillates and grows (simulating market movement)
    const changeVariation = Math.sin(progress * Math.PI * 2) * 0.3;
    const animatedStockChange = region.stockChange * (currentMultiplier + changeVariation);
    
    return {
      ...region,
      stockIndex: animatedStockIndex,
      stockChange: animatedStockChange,
      currencyStrength: Math.max(0, Math.min(1, region.currencyStrength * currentMultiplier)),
      bondYield: Math.max(0, region.bondYield * currentMultiplier),
    };
  });
}

/**
 * Generate animated flow data - starts small, grows to current
 */
function generateAnimatedFlows(flows: GlobalFlow[], progress: number): GlobalFlow[] {
  // Smooth easing for flow progression
  const easedProgress = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  
  // Start from 40% to create more dramatic growth effect
  const startMultiplier = 0.4;
  const currentMultiplier = startMultiplier + (1 - startMultiplier) * easedProgress;
  
  return flows.map((flow) => ({
    ...flow,
    amount: Math.max(0, flow.amount * currentMultiplier),
  }));
}

/**
 * Generate animated node data - nodes change size based on flow direction
 * Base size reflects market cap, then flow changes are applied
 */
function generateAnimatedNodes(nodes: AssetNode[], progress: number): AssetNode[] {
  // Smooth easing for node progression
  const easedProgress = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  
  // Find min and max market caps for base size calculation
  const marketCaps = nodes.map(n => n.marketCap);
  const minMarketCap = Math.min(...marketCaps);
  const maxMarketCap = Math.max(...marketCaps);
  const marketCapRange = maxMarketCap - minMarketCap;
  
  return nodes.map((node) => {
    // Base size based on market cap (this stays constant, reflects market size)
    const normalizedMarketCap = marketCapRange > 0 
      ? (node.marketCap - minMarketCap) / marketCapRange 
      : 0.5;
    const minBaseSize = 350;
    const maxBaseSize = 800;
    const baseSize = minBaseSize + (normalizedMarketCap * (maxBaseSize - minBaseSize));
    
    // Animate netFlowPct from 0 (neutral) to current value
    // This creates the effect of nodes growing/shrinking based on flow
    // If netFlowPct is positive, node grows; if negative, node shrinks
    const animatedNetFlowPct = node.netFlowPct * easedProgress;
    
    // Apply flow multiplier to base size
    // Start at base size (netFlowPct = 0), then move toward final size
    const flowMultiplier = 1 + (animatedNetFlowPct / 100) * 2;
    const animatedSize = baseSize * flowMultiplier;
    
    // Market cap stays constant (reflects actual market size)
    // Only netFlowPct changes to show flow animation
    return {
      ...node,
      size: animatedSize,
      netFlowPct: animatedNetFlowPct,
      // Market cap remains unchanged - it represents the base market size
      marketCap: node.marketCap,
    };
  });
}

/**
 * Generate animated edge data
 */
function generateAnimatedEdges(edges: FlowEdge[], progress: number): FlowEdge[] {
  // Smooth easing for edge progression
  const easedProgress = progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
  
  // Start from 30% for more dramatic flow intensity growth
  const startMultiplier = 0.3;
  const currentMultiplier = startMultiplier + (1 - startMultiplier) * easedProgress;
  
  return edges.map((edge) => ({
    ...edge,
    // Flow intensity grows from weak to strong
    flowIntensity: Math.max(0, Math.min(1, edge.flowIntensity * currentMultiplier)),
    // Correlation maintains its sign but grows in magnitude
    correlation: Math.max(-1, Math.min(1, edge.correlation * (0.5 + currentMultiplier * 0.5))),
  }));
}

