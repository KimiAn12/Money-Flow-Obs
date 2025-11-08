"""
Global Market Flow API endpoints.
"""

import logging
from datetime import datetime
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query

from app.core.cache import get_cache
from app.core.data_pipeline import DataPipeline
from app.core.metrics import MetricsCalculator
from app.core.persistence import DataPersistence
from app.models.schemas import GlobalFlowData, RegionData, GlobalFlow, AssetType, TimeRange

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/global-flow", tags=["global-flow"])

# Initialize components
data_pipeline = DataPipeline()
metrics_calculator = MetricsCalculator(window_size=30)
cache = get_cache()
persistence = DataPersistence(data_dir="data")


@router.get("", response_model=GlobalFlowData)
async def get_global_flow(
    time_range: TimeRange = Query(TimeRange.ONE_WEEK, alias="timeRange"),
    refresh: bool = Query(False, description="Force refresh of data")
):
    """
    Get global market flow data with regional metrics and bilateral flows.
    
    Args:
        time_range: Time range for data aggregation
        refresh: Force refresh of cached data
        
    Returns:
        GlobalFlowData with regions and flows
    """
    try:
        cache_key = f"global_flow_{time_range.value}"
        
        # Check cache
        if not refresh:
            cached_data = cache.get(cache_key)
            if cached_data:
                logger.info("Returning cached global flow data")
                return cached_data
        
        logger.info(f"Generating global flow data for time_range={time_range.value}")
        
        # Fetch regional data (async)
        regional_data_df = await data_pipeline.fetch_regional_data(days=90)
        regional_data_df = data_pipeline.clean_data(regional_data_df)
        
        # Fetch flow data
        flow_data_df = data_pipeline.fetch_flow_data(days=90)
        flow_data_df = data_pipeline.clean_data(flow_data_df)
        
        # Get current regional metrics
        regional_metrics = data_pipeline.get_current_regional_indices()
        
        # Build regions
        regions = []
        region_ids = list(data_pipeline.REGIONS.keys())
        
        for region_id in region_ids:
            region_info = data_pipeline.REGIONS[region_id]
            metrics = regional_metrics[region_id]
            
            # Calculate stock change (percentage)
            latest_data = regional_data_df[regional_data_df["region_id"] == region_id]
            if len(latest_data) > 1:
                latest_index = latest_data.iloc[-1]["stock_index"]
                previous_index = latest_data.iloc[-2]["stock_index"]
                stock_change = ((latest_index - previous_index) / previous_index) * 100
            else:
                stock_change = 0.0
            
            region = RegionData(
                id=region_id,
                name=region_info["name"],
                stockIndex=metrics["stock_index"],
                stockChange=float(stock_change),
                currency=region_info["currency"],
                currencyStrength=metrics["currency_strength"],
                bondYield=metrics["bond_yield"]
            )
            regions.append(region)
        
        # Build flows
        flows = []
        latest_date = flow_data_df["date"].max()
        latest_flows = flow_data_df[flow_data_df["date"] == latest_date]
        
        # Aggregate flows by source-target-asset_type
        flow_groups = latest_flows.groupby(["source", "target", "asset_type"]).agg({
            "amount": "sum"
        }).reset_index()
        
        for _, row in flow_groups.iterrows():
            source = row["source"]
            target = row["target"]
            asset_type_str = row["asset_type"]
            amount = row["amount"]
            
            # Calculate net flow percentage
            # Get previous period flows for comparison
            previous_date = latest_date - pd.Timedelta(days=7)
            previous_flows = flow_data_df[
                (flow_data_df["date"] >= previous_date) &
                (flow_data_df["date"] < latest_date)
            ]
            
            previous_amount = previous_flows[
                (previous_flows["source"] == source) &
                (previous_flows["target"] == target) &
                (previous_flows["asset_type"] == asset_type_str)
            ]["amount"].sum()
            
            net_flow_percent = metrics_calculator.calculate_net_flow_percentage(
                amount, previous_amount if previous_amount > 0 else amount * 0.9
            )
            
            # Determine asset type
            try:
                asset_type = AssetType(asset_type_str)
            except ValueError:
                asset_type = AssetType.EQUITIES  # Default
            
            flow = GlobalFlow(
                source=source,
                target=target,
                amount=float(amount),
                assetType=asset_type,
                netFlowPercent=float(net_flow_percent)
            )
            flows.append(flow)
        
        # If no flows generated, create some mock flows
        if not flows:
            logger.warning("No flows found, generating mock flows")
            for source in region_ids:
                for target in region_ids:
                    if source != target:
                        # Generate a few flows
                        import random
                        if random.random() > 0.7:  # 30% chance of flow
                            asset_type = random.choice([
                                AssetType.EQUITIES,
                                AssetType.BONDS,
                                AssetType.CURRENCY
                            ])
                            amount = random.uniform(1_000_000_000, 50_000_000_000)
                            net_flow = random.uniform(-5.0, 5.0)
                            
                            flow = GlobalFlow(
                                source=source,
                                target=target,
                                amount=amount,
                                assetType=asset_type,
                                netFlowPercent=net_flow
                            )
                            flows.append(flow)
        
        # Build response
        response = GlobalFlowData(
            timestamp=datetime.now(),
            regions=regions,
            flows=flows
        )
        
        # Cache the response
        cache.set(cache_key, response, ttl=300)  # 5 minutes
        
        # Persist data
        try:
            persistence.save_to_parquet(regional_data_df, "global_flow_regional")
            persistence.save_to_parquet(flow_data_df, "global_flow_flows")
            logger.info("Saved global flow data to disk")
        except Exception as e:
            logger.warning(f"Failed to persist data: {e}")
        
        logger.info(f"Generated global flow data: {len(regions)} regions, {len(flows)} flows")
        return response
        
    except Exception as e:
        logger.error(f"Error generating global flow data: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error generating global flow data: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "global-flow"}

