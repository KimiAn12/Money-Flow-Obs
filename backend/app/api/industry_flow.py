"""
Industry Flow API endpoints.
"""

import logging
import random
from datetime import datetime
from typing import List

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import IndustryFlowData, AssetNode, FlowEdge, TimeRange

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/industry-flow", tags=["industry-flow"])

# Asset class definitions
ASSET_CLASSES = [
    {"id": "Stocks", "baseMarketCap": 41000},  # in billions
    {"id": "Bonds", "baseMarketCap": 25000},
    {"id": "Commodities", "baseMarketCap": 8000},
    {"id": "Crypto", "baseMarketCap": 3500},
    {"id": "Cash", "baseMarketCap": 15000},
]


def generate_net_flow_pct() -> float:
    """Generate a random net flow percentage between -5% and +5%."""
    return round(random.uniform(-5.0, 5.0), 2)


def calculate_size(net_flow_pct: float) -> float:
    """Calculate node size based on net flow percentage."""
    return round(1 + (net_flow_pct / 100), 4)


def generate_market_cap(base_market_cap: float) -> float:
    """Generate a plausible market cap with some variation."""
    # Add ±10% variation to base market cap
    variation = random.uniform(-0.1, 0.1)
    market_cap = base_market_cap * (1 + variation)
    return round(market_cap, 2)


def generate_correlation() -> float:
    """Generate a random correlation value between -1 and 1."""
    return round(random.uniform(-1.0, 1.0), 4)


def calculate_flow_intensity(correlation: float, net_flow_pct_1: float, net_flow_pct_2: float) -> float:
    """
    Calculate flow intensity as: abs(correlation) * normalized average of netFlowPct values.
    
    Normalize netFlowPct values to 0-1 range (from -5 to +5 range).
    """
    # Normalize netFlowPct from [-5, 5] to [0, 1]
    normalized_1 = (net_flow_pct_1 + 5) / 10
    normalized_2 = (net_flow_pct_2 + 5) / 10
    
    # Calculate average
    avg_normalized = (normalized_1 + normalized_2) / 2
    
    # Flow intensity = abs(correlation) * normalized average
    flow_intensity = abs(correlation) * avg_normalized
    
    return round(flow_intensity, 4)


@router.get("", response_model=IndustryFlowData)
async def get_industry_flow(
    time_range: TimeRange = Query(TimeRange.ONE_WEEK, alias="timeRange"),
    refresh: bool = Query(False, description="Force refresh of data")
):
    """
    Get industry flow data with dynamic nodes and edges.
    
    This endpoint returns JSON data for a dynamic money flow graph. Each node represents
    an asset class (Stocks, Bonds, Commodities, Crypto, Cash) with a size property that
    grows or shrinks based on simulated net inflows or outflows of capital.
    
    All values are recalculated on every request to simulate live market movement.
    
    Args:
        time_range: Time range for data aggregation (currently not used, but kept for API compatibility)
        refresh: Force refresh of cached data (values are always recalculated)
        
    Returns:
        IndustryFlowData with nodes, edges, and timestamp
    """
    try:
        logger.info(f"Generating industry flow data (time_range={time_range.value}, refresh={refresh})")
        
        # Generate nodes - recalculate all values on every request
        nodes: List[AssetNode] = []
        node_flow_data = {}  # Store netFlowPct for each node to use in edge calculations
        
        for asset in ASSET_CLASSES:
            # Generate net flow percentage (-5% to +5%)
            net_flow_pct = generate_net_flow_pct()
            node_flow_data[asset["id"]] = net_flow_pct
            
            # Calculate size: size = 1 + (netFlowPct / 100)
            size = calculate_size(net_flow_pct)
            
            # Generate market cap with variation
            market_cap = generate_market_cap(asset["baseMarketCap"])
            
            node = AssetNode(
                id=asset["id"],
                size=size,
                netFlowPct=net_flow_pct,
                marketCap=market_cap
            )
            nodes.append(node)
        
        # Generate edges between every pair of nodes
        edges: List[FlowEdge] = []
        
        for i, source_node in enumerate(nodes):
            for target_node in nodes[i+1:]:
                # Generate correlation between -1 and 1
                correlation = generate_correlation()
                
                # Calculate flow intensity
                source_net_flow = node_flow_data[source_node.id]
                target_net_flow = node_flow_data[target_node.id]
                flow_intensity = calculate_flow_intensity(
                    correlation, source_net_flow, target_net_flow
                )
                
                edge = FlowEdge(
                    source=source_node.id,
                    target=target_node.id,
                    correlation=correlation,
                    flowIntensity=flow_intensity
                )
                edges.append(edge)
        
        # Build response
        response = IndustryFlowData(
            timestamp=datetime.now(),
            nodes=nodes,
            edges=edges
        )
        
        logger.info(f"Generated industry flow data: {len(nodes)} nodes, {len(edges)} edges")
        return response
        
    except Exception as e:
        logger.error(f"Error generating industry flow data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating industry flow data: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "industry-flow"}
