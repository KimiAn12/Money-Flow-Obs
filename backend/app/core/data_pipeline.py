"""
Data pipeline module for fetching and processing financial market data.
Currently uses mock data, but structured for easy integration with real APIs.
"""

import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class DataPipeline:
    """Handles data fetching, cleaning, and transformation."""
    
    # Asset definitions
    ASSETS = {
        "stocks": {"name": "Stocks", "base_market_cap": 95_000_000_000_000, "volatility": 0.15},
        "bonds": {"name": "Bonds", "base_market_cap": 128_000_000_000_000, "volatility": 0.08},
        "commodities": {"name": "Commodities", "base_market_cap": 21_000_000_000_000, "volatility": 0.20},
        "crypto": {"name": "Crypto", "base_market_cap": 2_300_000_000_000, "volatility": 0.35},
        "cash": {"name": "Cash", "base_market_cap": 45_000_000_000_000, "volatility": 0.01},
    }
    
    # Region definitions
    REGIONS = {
        "usa": {"name": "USA", "base_index": 5247.89, "currency": "USD", "base_yield": 4.32},
        "china": {"name": "China", "base_index": 3187.42, "currency": "CNY", "base_yield": 2.68},
        "europe": {"name": "Europe", "base_index": 4892.15, "currency": "EUR", "base_yield": 2.95},
        "japan": {"name": "Japan", "base_index": 38764.32, "currency": "JPY", "base_yield": 0.75},
        "india": {"name": "India", "base_index": 72458.79, "currency": "INR", "base_yield": 7.18},
    }
    
    def __init__(self):
        """Initialize the data pipeline."""
        self._historical_data: Dict[str, pd.DataFrame] = {}
        self._seed = 42
        random.seed(self._seed)
        np.random.seed(self._seed)
        logger.info("DataPipeline initialized")
    
    def fetch_asset_prices(self, days: int = 30) -> pd.DataFrame:
        """
        Fetch historical price data for all assets.
        
        Args:
            days: Number of days of historical data to generate
            
        Returns:
            DataFrame with columns: date, asset_id, price, volume
        """
        logger.info(f"Fetching asset prices for {days} days")
        
        dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
        data = []
        
        for asset_id, asset_info in self.ASSETS.items():
            base_price = 100.0
            volatility = asset_info["volatility"]
            
            # Generate random walk prices with drift
            prices = [base_price]
            for i in range(1, len(dates)):
                # Random walk with some mean reversion
                change = np.random.normal(0, volatility)
                prices.append(prices[-1] * (1 + change))
            
            # Generate volumes (market cap proxy)
            base_volume = asset_info["base_market_cap"] / 1_000_000_000  # Convert to billions
            volumes = [base_volume * (1 + np.random.normal(0, 0.05)) for _ in dates]
            
            # Ensure one entry per date per asset
            for date, price, volume in zip(dates, prices, volumes):
                data.append({
                    "date": pd.Timestamp(date),  # Ensure proper timestamp
                    "asset_id": asset_id,
                    "price": float(price),
                    "volume": float(volume),
                })
        
        # Remove any duplicates
        df = pd.DataFrame(data)
        df = df.drop_duplicates(subset=["date", "asset_id"], keep="last")
        
        # DataFrame already created above with duplicate removal
        self._historical_data["asset_prices"] = df
        logger.info(f"Fetched {len(df)} price records")
        return df
    
    def fetch_regional_data(self, days: int = 30) -> pd.DataFrame:
        """
        Fetch historical regional market data.
        
        Args:
            days: Number of days of historical data to generate
            
        Returns:
            DataFrame with columns: date, region_id, stock_index, currency_strength, bond_yield
        """
        logger.info(f"Fetching regional data for {days} days")
        
        dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
        data = []
        
        for region_id, region_info in self.REGIONS.items():
            base_index = region_info["base_index"]
            base_yield = region_info["base_yield"]
            
            # Generate index values
            indices = [base_index]
            for i in range(1, len(dates)):
                change = np.random.normal(0, 0.02)  # 2% daily volatility
                indices.append(indices[-1] * (1 + change))
            
            # Generate currency strength (relative to USD)
            base_strength = 1.0 if region_id == "usa" else np.random.uniform(0.75, 1.15)
            strengths = [base_strength * (1 + np.random.normal(0, 0.01)) for _ in dates]
            
            # Generate bond yields
            yields = [base_yield * (1 + np.random.normal(0, 0.05)) for _ in dates]
            
            for date, index, strength, yield_val in zip(dates, indices, strengths, yields):
                data.append({
                    "date": date,
                    "region_id": region_id,
                    "stock_index": index,
                    "currency_strength": strength,
                    "bond_yield": yield_val,
                })
        
        df = pd.DataFrame(data)
        self._historical_data["regional_data"] = df
        logger.info(f"Fetched {len(df)} regional records")
        return df
    
    def fetch_flow_data(self, days: int = 30) -> pd.DataFrame:
        """
        Fetch historical flow data between regions.
        
        Args:
            days: Number of days of historical data to generate
            
        Returns:
            DataFrame with columns: date, source, target, amount, asset_type
        """
        logger.info(f"Fetching flow data for {days} days")
        
        dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
        regions = list(self.REGIONS.keys())
        asset_types = ["equities", "bonds", "currency"]
        
        data = []
        
        # Generate flows between regions
        for date in dates:
            # Generate 10-15 flows per day
            num_flows = random.randint(10, 15)
            
            for _ in range(num_flows):
                source = random.choice(regions)
                target = random.choice([r for r in regions if r != source])
                asset_type = random.choice(asset_types)
                
                # Flow amounts in millions
                base_amount = random.uniform(1_000, 50_000)  # $1B to $50B
                amount = base_amount * 1_000_000  # Convert to actual amount
                
                data.append({
                    "date": date,
                    "source": source,
                    "target": target,
                    "amount": amount,
                    "asset_type": asset_type,
                })
        
        df = pd.DataFrame(data)
        self._historical_data["flow_data"] = df
        logger.info(f"Fetched {len(df)} flow records")
        return df
    
    def clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and validate data.
        
        Args:
            df: Raw DataFrame
            
        Returns:
            Cleaned DataFrame
        """
        logger.info("Cleaning data")
        
        # Remove duplicates
        df = df.drop_duplicates()
        
        # Remove invalid values
        df = df.replace([np.inf, -np.inf], np.nan)
        df = df.dropna()
        
        # Sort by date
        if "date" in df.columns:
            df = df.sort_values("date")
        
        logger.info(f"Cleaned data: {len(df)} records remaining")
        return df
    
    def get_current_market_caps(self) -> Dict[str, float]:
        """Get current market capitalization for each asset."""
        if "asset_prices" not in self._historical_data:
            self.fetch_asset_prices()
        
        df = self._historical_data["asset_prices"]
        latest_date = df["date"].max()
        latest_data = df[df["date"] == latest_date]
        
        market_caps = {}
        for asset_id in self.ASSETS.keys():
            asset_data = latest_data[latest_data["asset_id"] == asset_id]
            if not asset_data.empty:
                # Use volume as proxy for market cap
                market_caps[asset_id] = asset_data.iloc[0]["volume"] * 1_000_000_000
            else:
                market_caps[asset_id] = self.ASSETS[asset_id]["base_market_cap"]
        
        return market_caps
    
    def get_current_regional_indices(self) -> Dict[str, Dict[str, float]]:
        """Get current regional market indices and metrics."""
        if "regional_data" not in self._historical_data:
            self.fetch_regional_data()
        
        df = self._historical_data["regional_data"]
        latest_date = df["date"].max()
        latest_data = df[df["date"] == latest_date]
        
        regional_metrics = {}
        for region_id in self.REGIONS.keys():
            region_data = latest_data[latest_data["region_id"] == region_id]
            if not region_data.empty:
                row = region_data.iloc[0]
                regional_metrics[region_id] = {
                    "stock_index": row["stock_index"],
                    "currency_strength": row["currency_strength"],
                    "bond_yield": row["bond_yield"],
                }
            else:
                region_info = self.REGIONS[region_id]
                regional_metrics[region_id] = {
                    "stock_index": region_info["base_index"],
                    "currency_strength": 1.0 if region_id == "usa" else 0.9,
                    "bond_yield": region_info["base_yield"],
                }
        
        return regional_metrics

