"""
API clients for external data sources (Alpha Vantage, FRED).
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional

import httpx
import pandas as pd

from app.config import settings

logger = logging.getLogger(__name__)


class AlphaVantageClient:
    """Client for Alpha Vantage API."""
    
    BASE_URL = "https://www.alphavantage.co/query"
    
    def __init__(self, api_key: str):
        """
        Initialize Alpha Vantage client.
        
        Args:
            api_key: Alpha Vantage API key
        """
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=settings.API_REQUEST_TIMEOUT)
        logger.info("AlphaVantageClient initialized")
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def get_time_series_daily(
        self, 
        symbol: str, 
        outputsize: str = "full"
    ) -> Optional[pd.DataFrame]:
        """
        Get daily time series data for a symbol.
        
        Args:
            symbol: Stock symbol (e.g., 'SPY', 'QQQ')
            outputsize: 'compact' (100 data points) or 'full' (all data)
            
        Returns:
            DataFrame with columns: date, open, high, low, close, volume
        """
        if not self.api_key:
            logger.warning("Alpha Vantage API key not provided")
            return None
        
        try:
            params = {
                "function": "TIME_SERIES_DAILY",
                "symbol": symbol,
                "apikey": self.api_key,
                "outputsize": outputsize,
                "datatype": "json"
            }
            
            response = await self.client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Check for API errors
            if "Error Message" in data:
                logger.error(f"Alpha Vantage API error: {data['Error Message']}")
                return None
            
            # Check for rate limiting messages
            if "Note" in data:
                logger.warning(f"Alpha Vantage API rate limit: {data['Note']}")
                return None
            
            if "Information" in data:
                logger.warning(f"Alpha Vantage API info/rate limit: {data['Information']}")
                return None
            
            # Check if we got the expected data structure
            if "Meta Data" not in data and "Time Series (Daily)" not in data:
                # Likely a rate limit or error response
                logger.warning(f"Alpha Vantage API unexpected response for {symbol}. Keys: {list(data.keys())}")
                return None
            
            # Extract time series data
            time_series_key = "Time Series (Daily)"
            if time_series_key not in data:
                logger.warning(f"No time series data found for {symbol}. Response keys: {list(data.keys())}")
                return None
            
            time_series = data[time_series_key]
            
            # Convert to DataFrame
            records = []
            for date_str, values in time_series.items():
                records.append({
                    "date": pd.to_datetime(date_str),
                    "open": float(values["1. open"]),
                    "high": float(values["2. high"]),
                    "low": float(values["3. low"]),
                    "close": float(values["4. close"]),
                    "volume": float(values["5. volume"]),
                })
            
            df = pd.DataFrame(records)
            df = df.sort_values("date")
            df = df.reset_index(drop=True)
            
            logger.info(f"Fetched {len(df)} records for {symbol}")
            return df
            
        except httpx.RequestError as e:
            logger.error(f"Request error fetching {symbol}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching {symbol}: {e}", exc_info=True)
            return None
    
    async def get_crypto_daily(
        self, 
        symbol: str, 
        market: str = "USD"
    ) -> Optional[pd.DataFrame]:
        """
        Get daily cryptocurrency data.
        
        Args:
            symbol: Crypto symbol (e.g., 'BTC', 'ETH')
            market: Market currency (default: 'USD')
            
        Returns:
            DataFrame with columns: date, open, high, low, close, volume
        """
        if not self.api_key:
            logger.warning("Alpha Vantage API key not provided")
            return None
        
        try:
            params = {
                "function": "DIGITAL_CURRENCY_DAILY",
                "symbol": symbol,
                "market": market,
                "apikey": self.api_key,
                "datatype": "json"
            }
            
            response = await self.client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Check for API errors
            if "Error Message" in data:
                logger.error(f"Alpha Vantage API error: {data['Error Message']}")
                return None
            
            # Check for rate limiting messages
            if "Note" in data:
                logger.warning(f"Alpha Vantage API rate limit: {data['Note']}")
                return None
            
            if "Information" in data:
                logger.warning(f"Alpha Vantage API info/rate limit: {data['Information']}")
                return None
            
            # Extract time series data
            time_series_key = f"Time Series (Digital Currency Daily)"
            if time_series_key not in data:
                logger.warning(f"No time series data found for {symbol}. Response keys: {list(data.keys())}")
                return None
            
            time_series = data[time_series_key]
            
            # Convert to DataFrame
            records = []
            for date_str, values in time_series.items():
                # Alpha Vantage crypto API uses different key formats - try both
                open_key = f"1a. open ({market})"
                high_key = f"2a. high ({market})"
                low_key = f"3a. low ({market})"
                close_key = f"4a. close ({market})"
                
                # Fallback to alternative key format
                if open_key not in values:
                    open_key = "1a. open (USD)"
                    high_key = "2a. high (USD)"
                    low_key = "3a. low (USD)"
                    close_key = "4a. close (USD)"
                
                # Try to get volume (might be in different format)
                volume_key = "5. volume" if "5. volume" in values else "6. market cap (USD)"
                
                try:
                    records.append({
                        "date": pd.to_datetime(date_str),
                        "open": float(values.get(open_key, values.get("1. open", 0))),
                        "high": float(values.get(high_key, values.get("2. high", 0))),
                        "low": float(values.get(low_key, values.get("3. low", 0))),
                        "close": float(values.get(close_key, values.get("4. close", 0))),
                        "volume": float(values.get(volume_key, values.get("5. volume", 0))),
                    })
                except (KeyError, ValueError) as e:
                    logger.warning(f"Skipping date {date_str} due to parsing error: {e}")
                    continue
            
            df = pd.DataFrame(records)
            df = df.sort_values("date")
            df = df.reset_index(drop=True)
            
            logger.info(f"Fetched {len(df)} crypto records for {symbol}")
            return df
            
        except httpx.RequestError as e:
            logger.error(f"Request error fetching crypto {symbol}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching crypto {symbol}: {e}", exc_info=True)
            return None


class FREDClient:
    """Client for FRED (Federal Reserve Economic Data) API."""
    
    BASE_URL = "https://api.stlouisfed.org/fred/series/observations"
    
    def __init__(self, api_key: str):
        """
        Initialize FRED client.
        
        Args:
            api_key: FRED API key
        """
        self.api_key = api_key
        self.client = httpx.AsyncClient(timeout=settings.API_REQUEST_TIMEOUT)
        logger.info("FREDClient initialized")
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def get_series(
        self, 
        series_id: str, 
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        frequency: str = "d"
    ) -> Optional[pd.DataFrame]:
        """
        Get economic data series from FRED.
        
        Args:
            series_id: FRED series ID (e.g., 'DGS10' for 10-year Treasury yield)
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            frequency: Data frequency ('d' for daily, 'w' for weekly, 'm' for monthly)
            
        Returns:
            DataFrame with columns: date, value
        """
        if not self.api_key:
            logger.warning("FRED API key not provided")
            return None
        
        try:
            # Default to last 90 days if not specified
            if end_date is None:
                end_date = datetime.now().strftime("%Y-%m-%d")
            if start_date is None:
                start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
            
            params = {
                "series_id": series_id,
                "api_key": self.api_key,
                "file_type": "json",
                "observation_start": start_date,
                "observation_end": end_date,
                "frequency": frequency,
            }
            
            response = await self.client.get(self.BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()
            
            # Check for errors
            if "error_code" in data:
                logger.error(f"FRED API error: {data.get('error_message', 'Unknown error')}")
                return None
            
            # Extract observations
            observations = data.get("observations", [])
            if not observations:
                logger.warning(f"No observations found for series {series_id}")
                return None
            
            # Convert to DataFrame
            records = []
            for obs in observations:
                # Skip missing values (marked as '.')
                if obs.get("value") != ".":
                    try:
                        records.append({
                            "date": pd.to_datetime(obs["date"]),
                            "value": float(obs["value"]),
                        })
                    except (ValueError, KeyError):
                        continue
            
            if not records:
                logger.warning(f"No valid observations for series {series_id}")
                return None
            
            df = pd.DataFrame(records)
            df = df.sort_values("date")
            df = df.reset_index(drop=True)
            
            logger.info(f"Fetched {len(df)} records for FRED series {series_id}")
            return df
            
        except httpx.RequestError as e:
            logger.error(f"Request error fetching FRED series {series_id}: {e}")
            return None
        except Exception as e:
            logger.error(f"Error fetching FRED series {series_id}: {e}", exc_info=True)
            return None
    
    async def get_multiple_series(
        self, 
        series_ids: List[str],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, pd.DataFrame]:
        """
        Get multiple FRED series.
        
        Args:
            series_ids: List of FRED series IDs
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            
        Returns:
            Dictionary mapping series_id to DataFrame
        """
        results = {}
        for series_id in series_ids:
            df = await self.get_series(series_id, start_date, end_date)
            if df is not None:
                results[series_id] = df
            # Add small delay to avoid rate limiting
            await asyncio.sleep(0.2)
        return results

