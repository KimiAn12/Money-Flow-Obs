"""
Data pipeline module for fetching and processing financial market data.
Uses real APIs (Alpha Vantage, FRED) with fallback to mock data.
"""

import asyncio
import logging
import random
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

from app.config import settings
from app.core.api_clients import AlphaVantageClient, FREDClient

logger = logging.getLogger(__name__)


class DataPipeline:
    """Handles data fetching, cleaning, and transformation."""
    
    # Asset definitions with API mappings
    ASSETS = {
        "stocks": {
            "name": "Stocks",
            "base_market_cap": 95_000_000_000_000,
            "volatility": 0.15,
            "symbol": "SPY",  # S&P 500 ETF
            "fred_series": "SP500",  # S&P 500 Index
        },
        "bonds": {
            "name": "Bonds",
            "base_market_cap": 128_000_000_000_000,
            "volatility": 0.08,
            "symbol": "TLT",  # 20+ Year Treasury ETF
            "fred_series": "DGS10",  # 10-Year Treasury Yield
        },
        "commodities": {
            "name": "Commodities",
            "base_market_cap": 21_000_000_000_000,
            "volatility": 0.20,
            "symbol": "GLD",  # Gold ETF
            "fred_series": None,
        },
        "crypto": {
            "name": "Crypto",
            "base_market_cap": 2_300_000_000_000,
            "volatility": 0.35,
            "symbol": "BTC",  # Bitcoin
            "crypto": True,
        },
        "cash": {
            "name": "Cash",
            "base_market_cap": 45_000_000_000_000,
            "volatility": 0.01,
            "fred_series": "DFF",  # Federal Funds Rate
        },
    }
    
    # Region definitions with FRED series mappings
    REGIONS = {
        "usa": {
            "name": "USA",
            "base_index": 5247.89,
            "currency": "USD",
            "base_yield": 4.32,
            "index_series": "SP500",  # S&P 500
            "yield_series": "DGS10",  # 10-Year Treasury Yield
            "currency_series": "DEXUSEU",  # USD/EUR (inverse for USD strength)
        },
        "china": {
            "name": "China",
            "base_index": 3187.42,
            "currency": "CNY",
            "base_yield": 2.68,
            "index_series": None,  # Not directly available
            "yield_series": None,  # Not directly available
            "currency_series": "DEXCHUS",  # USD/CNY
        },
        "europe": {
            "name": "Europe",
            "base_index": 4892.15,
            "currency": "EUR",
            "base_yield": 2.95,
            "index_series": None,  # Could use STOXX50 if available
            "yield_series": None,  # IRLTLT01EZM156N not available with daily frequency - using base value
            "currency_series": "DEXUSEU",  # USD/EUR
        },
        "japan": {
            "name": "Japan",
            "base_index": 38764.32,
            "currency": "JPY",
            "base_yield": 0.75,
            "index_series": None,  # NIKKEI not directly available
            "yield_series": None,  # IRLTLT01JPM156N not available with daily frequency - using base value
            "currency_series": "DEXJPUS",  # USD/JPY
        },
        "india": {
            "name": "India",
            "base_index": 72458.79,
            "currency": "INR",
            "base_yield": 7.18,
            "index_series": None,  # Not directly available
            "yield_series": None,  # Not directly available
            "currency_series": "DEXINUS",  # USD/INR
        },
    }
    
    def __init__(self):
        """Initialize the data pipeline."""
        self._historical_data: Dict[str, pd.DataFrame] = {}
        self._seed = 42
        random.seed(self._seed)
        np.random.seed(self._seed)
        
        # Initialize API clients if keys are provided
        self.alpha_vantage = None
        self.fred = None
        
        if settings.USE_REAL_DATA:
            if settings.ALPHA_VANTAGE_API_KEY:
                self.alpha_vantage = AlphaVantageClient(settings.ALPHA_VANTAGE_API_KEY)
            if settings.FRED_API_KEY:
                self.fred = FREDClient(settings.FRED_API_KEY)
        
        logger.info(f"DataPipeline initialized (USE_REAL_DATA={settings.USE_REAL_DATA})")
    
    async def _fetch_asset_price_real(self, asset_id: str, days: int) -> Optional[pd.DataFrame]:
        """Fetch real asset price data from APIs."""
        if not settings.USE_REAL_DATA:
            return None
        
        asset_info = self.ASSETS[asset_id]
        
        # Try Alpha Vantage for stocks, bonds, commodities
        if self.alpha_vantage and "symbol" in asset_info:
            if asset_info.get("crypto"):
                # Fetch crypto data
                df = await self.alpha_vantage.get_crypto_daily(asset_info["symbol"])
            else:
                # Fetch stock/ETF data
                df = await self.alpha_vantage.get_time_series_daily(asset_info["symbol"])
            
            if df is not None and len(df) > 0:
                # Convert to our format
                df = df.copy()
                df["asset_id"] = asset_id
                df["price"] = df["close"]
                df["volume"] = df["volume"]
                df = df[["date", "asset_id", "price", "volume"]]
                
                # Limit to requested days
                if len(df) > days:
                    df = df.tail(days).reset_index(drop=True)
                
                return df
        
        # Try FRED for indices (stocks, bonds as indices)
        if self.fred and "fred_series" in asset_info and asset_info["fred_series"]:
            df = await self.fred.get_series(
                asset_info["fred_series"],
                start_date=(datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
            )
            
            if df is not None and len(df) > 0:
                # Convert to our format
                df = df.copy()
                df["asset_id"] = asset_id
                df["price"] = df["value"]
                # Use base market cap scaled by price change for volume proxy
                base_volume = asset_info["base_market_cap"] / 1_000_000_000
                df["volume"] = base_volume * (df["price"] / df["price"].iloc[0])
                df = df[["date", "asset_id", "price", "volume"]]
                return df
        
        return None
    
    def _fetch_asset_price_mock(self, asset_id: str, days: int) -> pd.DataFrame:
        """Generate mock asset price data."""
        logger.info(f"Using mock data for {asset_id}")
        
        asset_info = self.ASSETS[asset_id]
        dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
        base_price = 100.0
        volatility = asset_info["volatility"]
        
        # Generate random walk prices
        prices = [base_price]
        for i in range(1, len(dates)):
            change = np.random.normal(0, volatility)
            prices.append(prices[-1] * (1 + change))
        
        # Generate volumes
        base_volume = asset_info["base_market_cap"] / 1_000_000_000
        volumes = [base_volume * (1 + np.random.normal(0, 0.05)) for _ in dates]
        
        data = []
        for date, price, volume in zip(dates, prices, volumes):
            data.append({
                "date": pd.Timestamp(date),
                "asset_id": asset_id,
                "price": float(price),
                "volume": float(volume),
            })
        
        return pd.DataFrame(data)
    
    async def fetch_asset_prices(self, days: int = 30) -> pd.DataFrame:
        """
        Fetch historical price data for all assets.
        
        Args:
            days: Number of days of historical data to fetch
            
        Returns:
            DataFrame with columns: date, asset_id, price, volume
        """
        logger.info(f"Fetching asset prices for {days} days")
        
        all_data = []
        
        for asset_id in self.ASSETS.keys():
            # Try to fetch real data
            df = await self._fetch_asset_price_real(asset_id, days)
            
            # Fallback to mock data if real data not available
            if df is None or len(df) == 0:
                df = self._fetch_asset_price_mock(asset_id, days)
            
            all_data.append(df)
        
        # Combine all asset data
        if all_data:
            df = pd.concat(all_data, ignore_index=True)
            df = df.drop_duplicates(subset=["date", "asset_id"], keep="last")
            df = df.sort_values(["date", "asset_id"])
        else:
            df = pd.DataFrame(columns=["date", "asset_id", "price", "volume"])
        
        self._historical_data["asset_prices"] = df
        logger.info(f"Fetched {len(df)} price records")
        return df
    
    async def _fetch_regional_data_real(self, region_id: str, days: int) -> Optional[pd.DataFrame]:
        """Fetch real regional data from FRED."""
        if not settings.USE_REAL_DATA or not self.fred:
            return None
        
        region_info = self.REGIONS[region_id]
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        # Fetch stock index
        index_series = region_info.get("index_series")
        index_df = None
        if index_series:
            index_df = await self.fred.get_series(index_series, start_date=start_date)
            await asyncio.sleep(0.2)  # Rate limiting
        
        # Fetch bond yield
        yield_series = region_info.get("yield_series")
        yield_df = None
        if yield_series:
            yield_df = await self.fred.get_series(yield_series, start_date=start_date)
            await asyncio.sleep(0.2)  # Rate limiting
        
        # Fetch currency exchange rate
        currency_series = region_info.get("currency_series")
        currency_df = None
        if currency_series:
            currency_df = await self.fred.get_series(currency_series, start_date=start_date)
            await asyncio.sleep(0.2)  # Rate limiting
        
        # Combine data
        if index_df is None and yield_df is None and currency_df is None:
            return None
        
        # Get all unique dates
        all_dates = set()
        if index_df is not None:
            all_dates.update(index_df["date"].tolist())
        if yield_df is not None:
            all_dates.update(yield_df["date"].tolist())
        if currency_df is not None:
            all_dates.update(currency_df["date"].tolist())
        
        if not all_dates:
            return None
        
        # Create combined DataFrame
        dates = sorted(all_dates)
        data = []
        
        for date in dates:
            # Get stock index
            stock_index = region_info["base_index"]
            if index_df is not None:
                idx_data = index_df[index_df["date"] == date]
                if not idx_data.empty:
                    stock_index = float(idx_data.iloc[0]["value"])
            
            # Get bond yield
            bond_yield = region_info["base_yield"]
            if yield_df is not None:
                yld_data = yield_df[yield_df["date"] == date]
                if not yld_data.empty:
                    bond_yield = float(yld_data.iloc[0]["value"])
            
            # Get currency strength (inverse of USD/other for other currencies)
            currency_strength = 1.0 if region_id == "usa" else 0.9
            if currency_df is not None:
                curr_data = currency_df[currency_df["date"] == date]
                if not curr_data.empty:
                    exchange_rate = float(curr_data.iloc[0]["value"])
                    if region_id == "usa":
                        currency_strength = 1.0
                    else:
                        # For other currencies, strength is inverse of USD/XXX
                        # Normalize to reasonable range
                        currency_strength = 1.0 / exchange_rate if exchange_rate > 0 else 0.9
                        # Normalize to 0.5-1.5 range
                        currency_strength = max(0.5, min(1.5, currency_strength))
            
            data.append({
                "date": pd.Timestamp(date),
                "region_id": region_id,
                "stock_index": stock_index,
                "currency_strength": currency_strength,
                "bond_yield": bond_yield,
            })
        
        return pd.DataFrame(data)
    
    def _fetch_regional_data_mock(self, region_id: str, days: int) -> pd.DataFrame:
        """Generate mock regional data."""
        logger.info(f"Using mock data for region {region_id}")
        
        region_info = self.REGIONS[region_id]
        dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
        
        base_index = region_info["base_index"]
        base_yield = region_info["base_yield"]
        
        # Generate index values
        indices = [base_index]
        for i in range(1, len(dates)):
            change = np.random.normal(0, 0.02)
            indices.append(indices[-1] * (1 + change))
        
        # Generate currency strength
        base_strength = 1.0 if region_id == "usa" else np.random.uniform(0.75, 1.15)
        strengths = [base_strength * (1 + np.random.normal(0, 0.01)) for _ in dates]
        
        # Generate bond yields
        yields = [base_yield * (1 + np.random.normal(0, 0.05)) for _ in dates]
        
        data = []
        for date, index, strength, yield_val in zip(dates, indices, strengths, yields):
            data.append({
                "date": date,
                "region_id": region_id,
                "stock_index": index,
                "currency_strength": strength,
                "bond_yield": yield_val,
            })
        
        return pd.DataFrame(data)
    
    async def fetch_regional_data(self, days: int = 30) -> pd.DataFrame:
        """
        Fetch historical regional market data.
        
        Args:
            days: Number of days of historical data to fetch
            
        Returns:
            DataFrame with columns: date, region_id, stock_index, currency_strength, bond_yield
        """
        logger.info(f"Fetching regional data for {days} days")
        
        all_data = []
        
        for region_id in self.REGIONS.keys():
            # Try to fetch real data
            df = await self._fetch_regional_data_real(region_id, days)
            
            # Fallback to mock data if real data not available
            if df is None or len(df) == 0:
                df = self._fetch_regional_data_mock(region_id, days)
            
            all_data.append(df)
        
        # Combine all regional data
        if all_data:
            df = pd.concat(all_data, ignore_index=True)
            df = df.sort_values(["date", "region_id"])
        else:
            df = pd.DataFrame(columns=["date", "region_id", "stock_index", "currency_strength", "bond_yield"])
        
        self._historical_data["regional_data"] = df
        logger.info(f"Fetched {len(df)} regional records")
        return df
    
    def fetch_flow_data(self, days: int = 30) -> pd.DataFrame:
        """
        Fetch historical flow data between regions.
        Note: Flow data is still mock as there's no direct API for capital flows.
        
        Args:
            days: Number of days of historical data to generate
            
        Returns:
            DataFrame with columns: date, source, target, amount, asset_type
        """
        logger.info(f"Fetching flow data for {days} days (using mock data)")
        
        dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
        regions = list(self.REGIONS.keys())
        asset_types = ["equities", "bonds", "currency"]
        
        data = []
        
        # Generate flows between regions
        for date in dates:
            num_flows = random.randint(10, 15)
            
            for _ in range(num_flows):
                source = random.choice(regions)
                target = random.choice([r for r in regions if r != source])
                asset_type = random.choice(asset_types)
                
                base_amount = random.uniform(1_000, 50_000)
                amount = base_amount * 1_000_000
                
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
        # Check if we have cached data
        if "asset_prices" not in self._historical_data or self._historical_data["asset_prices"].empty:
            # Return base market caps if no data available
            # Note: In production, you'd want to fetch fresh data, but for sync calls
            # we return cached/base values to avoid blocking
            logger.warning("No asset price data available, using base market caps")
            return {asset_id: info["base_market_cap"] for asset_id, info in self.ASSETS.items()}
        
        df = self._historical_data["asset_prices"]
        if df.empty:
            return {asset_id: info["base_market_cap"] for asset_id, info in self.ASSETS.items()}
        
        latest_date = df["date"].max()
        latest_data = df[df["date"] == latest_date]
        
        market_caps = {}
        for asset_id in self.ASSETS.keys():
            asset_data = latest_data[latest_data["asset_id"] == asset_id]
            if not asset_data.empty:
                market_caps[asset_id] = asset_data.iloc[0]["volume"] * 1_000_000_000
            else:
                market_caps[asset_id] = self.ASSETS[asset_id]["base_market_cap"]
        
        return market_caps
    
    def get_current_regional_indices(self) -> Dict[str, Dict[str, float]]:
        """Get current regional market indices and metrics."""
        # Check if we have cached data
        if "regional_data" not in self._historical_data or self._historical_data["regional_data"].empty:
            # Return base values if no data available
            logger.warning("No regional data available, using base values")
            regional_metrics = {}
            for region_id, region_info in self.REGIONS.items():
                regional_metrics[region_id] = {
                    "stock_index": region_info["base_index"],
                    "currency_strength": 1.0 if region_id == "usa" else 0.9,
                    "bond_yield": region_info["base_yield"],
                }
            return regional_metrics
        
        df = self._historical_data["regional_data"]
        if df.empty:
            regional_metrics = {}
            for region_id, region_info in self.REGIONS.items():
                regional_metrics[region_id] = {
                    "stock_index": region_info["base_index"],
                    "currency_strength": 1.0 if region_id == "usa" else 0.9,
                    "bond_yield": region_info["base_yield"],
                }
            return regional_metrics
        
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
    
    async def close(self):
        """Close API clients."""
        if self.alpha_vantage:
            await self.alpha_vantage.close()
        if self.fred:
            await self.fred.close()
