"""
Pydantic models for Money Flow Observatory API responses.
These models match the TypeScript interfaces in the frontend.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class TimeRange(str, Enum):
    """Time range options for data queries."""
    ONE_DAY = "1D"
    ONE_WEEK = "1W"
    ONE_MONTH = "1M"
    THREE_MONTHS = "3M"
    ONE_YEAR = "1Y"


class FlowMetric(str, Enum):
    """Flow metric types."""
    CORRELATION = "correlation"
    NET_FLOW = "netFlow"
    ROLLING_CORR = "rollingCorr"


class AssetType(str, Enum):
    """Asset type classification."""
    EQUITIES = "equities"
    BONDS = "bonds"
    CURRENCY = "currency"
    COMMODITIES = "commodities"
    CRYPTO = "crypto"
    CASH = "cash"


class AssetNode(BaseModel):
    """Represents a single asset node in the industry flow graph."""
    id: str = Field(..., description="Unique identifier for the asset")
    size: float = Field(..., description="Node size based on net flow (1 + netFlowPct/100)", ge=0)
    netFlowPct: float = Field(..., description="Net flow percentage (-5 to +5)")
    marketCap: float = Field(..., description="Market capitalization in billions USD", ge=0)
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "Stocks",
                "size": 1.05,
                "netFlowPct": 5.0,
                "marketCap": 41000000000
            }
        }
    }


class FlowEdge(BaseModel):
    """Represents a flow edge between two assets."""
    source: str = Field(..., description="Source asset ID")
    target: str = Field(..., description="Target asset ID")
    correlation: float = Field(..., description="Correlation between source and target", ge=-1, le=1)
    flowIntensity: float = Field(..., description="Flow intensity (abs(correlation) * normalized avg netFlowPct)", ge=0)
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "source": "Stocks",
                "target": "Bonds",
                "correlation": 0.65,
                "flowIntensity": 0.42
            }
        }
    }


class IndustryFlowData(BaseModel):
    """Complete industry flow data structure."""
    timestamp: datetime = Field(..., description="Timestamp of the data snapshot")
    nodes: List[AssetNode] = Field(..., description="List of asset nodes")
    edges: List[FlowEdge] = Field(..., description="List of flow edges between all pairs of assets")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "timestamp": "2025-11-07T14:00:00Z",
                "nodes": [
                    {"id": "Stocks", "size": 1.05, "netFlowPct": 5.0, "marketCap": 41000000000},
                    {"id": "Bonds", "size": 0.97, "netFlowPct": -3.0, "marketCap": 25000000000}
                ],
                "edges": [
                    {"source": "Stocks", "target": "Bonds", "correlation": 0.65, "flowIntensity": 0.42}
                ]
            }
        }
    }


class RegionData(BaseModel):
    """Represents regional market data."""
    id: str = Field(..., description="Unique identifier for the region")
    name: str = Field(..., description="Display name of the region")
    stockIndex: float = Field(..., description="Current stock index value", ge=0)
    stockChange: float = Field(..., description="Stock index change percentage")
    currency: str = Field(..., description="Currency code")
    currencyStrength: float = Field(..., description="Currency strength relative to USD", ge=0)
    bondYield: float = Field(..., description="Bond yield percentage", ge=0)
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "usa",
                "name": "USA",
                "stockIndex": 5247.89,
                "stockChange": 0.85,
                "currency": "USD",
                "currencyStrength": 1.0,
                "bondYield": 4.32
            }
        }
    }


class GlobalFlow(BaseModel):
    """Represents a flow between two regions."""
    source: str = Field(..., description="Source region ID")
    target: str = Field(..., description="Target region ID")
    amount: float = Field(..., description="Flow amount in USD", ge=0)
    assetType: AssetType = Field(..., description="Type of asset being flowed")
    netFlowPercent: Optional[float] = Field(None, description="Net flow as percentage")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "source": "usa",
                "target": "china",
                "amount": 12500000000,
                "assetType": "equities",
                "netFlowPercent": 2.3
            }
        }
    }


class GlobalFlowData(BaseModel):
    """Complete global flow data structure."""
    timestamp: datetime = Field(..., description="Timestamp of the data snapshot")
    regions: List[RegionData] = Field(..., description="List of regional market data")
    flows: List[GlobalFlow] = Field(..., description="List of flows between regions")
    
    model_config = {
        "json_schema_extra": {
            "example": {
                "timestamp": "2025-11-07T14:30:00Z",
                "regions": [],
                "flows": []
            }
        }
    }

