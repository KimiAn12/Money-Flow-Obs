"""
Data refresh service for scheduled daily data fetching from APIs.
"""

import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd

from app.core.data_pipeline import DataPipeline
from app.core.persistence import DataPersistence
from app.config import settings

logger = logging.getLogger(__name__)


class DataRefreshService:
    """Service for refreshing data from APIs on a schedule."""
    
    def __init__(self):
        """Initialize the data refresh service."""
        self.data_pipeline = DataPipeline()
        self.persistence = DataPersistence(data_dir=settings.DATA_DIR)
        self.last_refresh_file = Path(settings.DATA_DIR) / "last_refresh.txt"
        logger.info("DataRefreshService initialized")
    
    def get_last_refresh_time(self) -> Optional[datetime]:
        """
        Get the timestamp of the last data refresh.
        
        Returns:
            Datetime of last refresh or None if never refreshed
        """
        if not self.last_refresh_file.exists():
            return None
        
        try:
            with open(self.last_refresh_file, "r") as f:
                timestamp_str = f.read().strip()
                return datetime.fromisoformat(timestamp_str)
        except Exception as e:
            logger.error(f"Error reading last refresh time: {e}")
            return None
    
    def save_last_refresh_time(self, timestamp: datetime) -> None:
        """
        Save the timestamp of the last data refresh.
        
        Args:
            timestamp: Datetime to save
        """
        try:
            self.last_refresh_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.last_refresh_file, "w") as f:
                f.write(timestamp.isoformat())
            logger.info(f"Saved last refresh time: {timestamp}")
        except Exception as e:
            logger.error(f"Error saving last refresh time: {e}")
    
    async def refresh_all_data(self) -> bool:
        """
        Refresh all data from APIs and save to persistent storage.
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info("Starting daily data refresh from APIs...")
            refresh_time = datetime.now()
            
            # Fetch all data from APIs
            logger.info("Fetching asset prices...")
            price_data = await self.data_pipeline.fetch_asset_prices(days=90)
            price_data = self.data_pipeline.clean_data(price_data)
            
            logger.info("Fetching regional data...")
            regional_data = await self.data_pipeline.fetch_regional_data(days=90)
            regional_data = self.data_pipeline.clean_data(regional_data)
            
            logger.info("Fetching flow data...")
            flow_data = self.data_pipeline.fetch_flow_data(days=90)
            flow_data = self.data_pipeline.clean_data(flow_data)
            
            # Save to persistent storage (overwrite existing)
            logger.info("Saving data to persistent storage...")
            self.persistence.save_to_parquet(price_data, "asset_prices_latest")
            self.persistence.save_to_parquet(regional_data, "regional_data_latest")
            self.persistence.save_to_parquet(flow_data, "flow_data_latest")
            
            # Save metadata
            metadata = {
                "refresh_time": refresh_time.isoformat(),
                "price_records": len(price_data),
                "regional_records": len(regional_data),
                "flow_records": len(flow_data),
            }
            import json
            metadata_file = Path(settings.DATA_DIR) / "data_metadata.json"
            with open(metadata_file, "w") as f:
                json.dump(metadata, f, indent=2)
            
            # Save last refresh time
            self.save_last_refresh_time(refresh_time)
            
            logger.info(
                f"Daily data refresh completed successfully at {refresh_time}. "
                f"Records: {len(price_data)} prices, {len(regional_data)} regional, {len(flow_data)} flows"
            )
            
            return True
            
        except Exception as e:
            logger.error(f"Error during daily data refresh: {e}", exc_info=True)
            return False
    
    def load_persisted_data(self) -> dict:
        """
        Load persisted data from disk.
        
        Returns:
            Dictionary with keys: asset_prices, regional_data, flow_data
        """
        data = {
            "asset_prices": None,
            "regional_data": None,
            "flow_data": None,
        }
        
        try:
            logger.info("Loading persisted data from disk...")
            
            # Load asset prices
            price_data = self.persistence.load_from_parquet("asset_prices_latest.parquet")
            if price_data is not None:
                data["asset_prices"] = price_data
                logger.info(f"Loaded {len(price_data)} asset price records")
            
            # Load regional data
            regional_data = self.persistence.load_from_parquet("regional_data_latest.parquet")
            if regional_data is not None:
                data["regional_data"] = regional_data
                logger.info(f"Loaded {len(regional_data)} regional data records")
            
            # Load flow data
            flow_data = self.persistence.load_from_parquet("flow_data_latest.parquet")
            if flow_data is not None:
                data["flow_data"] = flow_data
                logger.info(f"Loaded {len(flow_data)} flow data records")
            
            # Update data pipeline's internal cache
            if data["asset_prices"] is not None:
                self.data_pipeline._historical_data["asset_prices"] = data["asset_prices"]
            if data["regional_data"] is not None:
                self.data_pipeline._historical_data["regional_data"] = data["regional_data"]
            if data["flow_data"] is not None:
                self.data_pipeline._historical_data["flow_data"] = data["flow_data"]
            
            logger.info("Persisted data loaded successfully")
            
        except Exception as e:
            logger.error(f"Error loading persisted data: {e}", exc_info=True)
        
        return data
    
    async def close(self):
        """Close API clients."""
        await self.data_pipeline.close()

