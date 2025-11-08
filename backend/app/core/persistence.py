"""
Data persistence module for saving and loading data to/from disk.
"""

import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)


class DataPersistence:
    """Handles saving and loading data to/from disk."""
    
    def __init__(self, data_dir: str = "data"):
        """
        Initialize data persistence.
        
        Args:
            data_dir: Directory to store data files
        """
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"DataPersistence initialized with data_dir={data_dir}")
    
    def save_to_parquet(
        self,
        df: pd.DataFrame,
        filename: str,
        partition_by: Optional[str] = None
    ) -> str:
        """
        Save DataFrame to Parquet file.
        
        Args:
            df: DataFrame to save
            filename: Output filename (without extension)
            partition_by: Optional column name to partition by
            
        Returns:
            Path to saved file
        """
        filepath = self.data_dir / f"{filename}.parquet"
        
        try:
            if partition_by and partition_by in df.columns:
                # Save as partitioned parquet
                partition_path = self.data_dir / filename
                df.to_parquet(
                    partition_path,
                    partition_cols=[partition_by],
                    engine="pyarrow",
                    compression="snappy"
                )
                logger.info(f"Saved partitioned parquet to {partition_path}")
                return str(partition_path)
            else:
                # Save as single file
                df.to_parquet(filepath, engine="pyarrow", compression="snappy")
                logger.info(f"Saved parquet to {filepath}")
                return str(filepath)
        except Exception as e:
            logger.error(f"Error saving parquet: {e}")
            raise
    
    def load_from_parquet(self, filename: str) -> Optional[pd.DataFrame]:
        """
        Load DataFrame from Parquet file.
        
        Args:
            filename: Filename (with or without extension)
            
        Returns:
            DataFrame or None if file doesn't exist
        """
        filepath = self.data_dir / filename
        if not filepath.suffix:
            filepath = filepath.with_suffix(".parquet")
        
        if not filepath.exists():
            logger.warning(f"Parquet file not found: {filepath}")
            return None
        
        try:
            df = pd.read_parquet(filepath, engine="pyarrow")
            logger.info(f"Loaded parquet from {filepath}")
            return df
        except Exception as e:
            logger.error(f"Error loading parquet: {e}")
            return None
    
    def save_to_csv(
        self,
        df: pd.DataFrame,
        filename: str,
        index: bool = False
    ) -> str:
        """
        Save DataFrame to CSV file.
        
        Args:
            df: DataFrame to save
            filename: Output filename (without extension)
            index: Whether to include index
            
        Returns:
            Path to saved file
        """
        filepath = self.data_dir / f"{filename}.csv"
        
        try:
            df.to_csv(filepath, index=index)
            logger.info(f"Saved CSV to {filepath}")
            return str(filepath)
        except Exception as e:
            logger.error(f"Error saving CSV: {e}")
            raise
    
    def load_from_csv(self, filename: str) -> Optional[pd.DataFrame]:
        """
        Load DataFrame from CSV file.
        
        Args:
            filename: Filename (with or without extension)
            
        Returns:
            DataFrame or None if file doesn't exist
        """
        filepath = self.data_dir / filename
        if not filepath.suffix:
            filepath = filepath.with_suffix(".csv")
        
        if not filepath.exists():
            logger.warning(f"CSV file not found: {filepath}")
            return None
        
        try:
            df = pd.read_csv(filepath, parse_dates=True)
            logger.info(f"Loaded CSV from {filepath}")
            return df
        except Exception as e:
            logger.error(f"Error loading CSV: {e}")
            return None
    
    def save_snapshot(
        self,
        data: dict,
        prefix: str = "snapshot"
    ) -> str:
        """
        Save a data snapshot with timestamp.
        
        Args:
            data: Dictionary of DataFrames or other data
            prefix: Filename prefix
            
        Returns:
            Path to saved snapshot directory
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        snapshot_dir = self.data_dir / f"{prefix}_{timestamp}"
        snapshot_dir.mkdir(parents=True, exist_ok=True)
        
        try:
            for key, value in data.items():
                if isinstance(value, pd.DataFrame):
                    filepath = snapshot_dir / f"{key}.parquet"
                    value.to_parquet(filepath, engine="pyarrow", compression="snappy")
                else:
                    # Save as JSON or pickle
                    import json
                    filepath = snapshot_dir / f"{key}.json"
                    with open(filepath, "w") as f:
                        json.dump(value, f, default=str)
            
            logger.info(f"Saved snapshot to {snapshot_dir}")
            return str(snapshot_dir)
        except Exception as e:
            logger.error(f"Error saving snapshot: {e}")
            raise
    
    def cleanup_old_files(self, days: int = 30) -> int:
        """
        Remove files older than specified days.
        
        Args:
            days: Number of days to keep
            
        Returns:
            Number of files removed
        """
        from datetime import timedelta
        
        cutoff_date = datetime.now() - timedelta(days=days)
        removed = 0
        
        for filepath in self.data_dir.rglob("*"):
            if filepath.is_file():
                file_time = datetime.fromtimestamp(filepath.stat().st_mtime)
                if file_time < cutoff_date:
                    filepath.unlink()
                    removed += 1
        
        if removed > 0:
            logger.info(f"Cleaned up {removed} old files")
        
        return removed

