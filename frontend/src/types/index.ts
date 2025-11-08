export interface AssetNode {
  id: string;
  size: number;
  netFlowPct: number;
  marketCap: number;
}

export interface FlowEdge {
  source: string;
  target: string;
  correlation: number;
  flowIntensity: number;
}

export interface IndustryFlowData {
  timestamp: string;
  nodes: AssetNode[];
  edges: FlowEdge[];
}

export interface RegionData {
  id: string;
  name: string;
  stockIndex: number;
  stockChange: number;
  currency: string;
  currencyStrength: number;
  bondYield: number;
}

export interface GlobalFlow {
  source: string;
  target: string;
  amount: number;
  assetType: 'equities' | 'bonds' | 'currency';
}

export interface GlobalFlowData {
  timestamp: string;
  regions: RegionData[];
  flows: GlobalFlow[];
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y';
export type FlowMetric = 'correlation' | 'netFlow' | 'rollingCorr';
export type AssetType = 'equities' | 'bonds' | 'currency';
