#!/usr/bin/env python3
"""
Run this script daily at 5 PM using cron (Linux/macOS) or Task Scheduler (Windows).
"""

import asyncio
import hashlib
import json
import logging
import os
import random
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

try:
    import httpx
    import numpy as np
    import pandas as pd
except ImportError as e:
    print(f"Error: Missing required package: {e}")
    print("Please install requirements: pip install -r scripts/requirements.txt")
    sys.exit(1)

# Configure logging
log_dir = Path(__file__).parent.parent / "logs"
log_dir.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_dir / "update_data.log"),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# API Configuration
ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY", "")
FRED_API_KEY = os.getenv("FRED_API_KEY", "")
ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query"
FRED_BASE_URL = "https://api.stlouisfed.org/fred/series/observations"

# Data output directory (relative to project root)
PROJECT_ROOT = Path(__file__).parent.parent
DATA_DIR = PROJECT_ROOT / "frontend" / "public" / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

# Asset definitions
ASSETS = {
    "stocks": {
        "name": "Stocks",
        "base_market_cap": 95_000_000_000_000,
        "symbol": "SPY",
        "fred_series": "SP500",
    },
    "bonds": {
        "name": "Bonds",
        "base_market_cap": 128_000_000_000_000,
        "symbol": "TLT",
        "fred_series": "DGS10",
    },
    "commodities": {
        "name": "Commodities",
        "base_market_cap": 21_000_000_000_000,
        "symbol": "GLD",
        "fred_series": None,
    },
    "crypto": {
        "name": "Crypto",
        "base_market_cap": 2_300_000_000_000,
        "symbol": "BTC",
        "crypto": True,
    },
    "cash": {
        "name": "Cash",
        "base_market_cap": 45_000_000_000_000,
        "fred_series": "DFF",
    },
}

# Region definitions
REGIONS = {
    "usa": {
        "name": "USA",
        "base_index": 5247.89,
        "currency": "USD",
        "base_yield": 4.32,
        "index_series": "SP500",
        "yield_series": "DGS10",
        "currency_series": "DEXUSEU",
    },
    "china": {
        "name": "China",
        "base_index": 3187.42,
        "currency": "CNY",
        "base_yield": 2.68,
        "index_series": None,
        "yield_series": None,
        "currency_series": "DEXCHUS",
    },
    "europe": {
        "name": "Europe",
        "base_index": 4892.15,
        "currency": "EUR",
        "base_yield": 2.95,
        "index_series": None,
        "yield_series": None,
        "currency_series": "DEXUSEU",
    },
    "japan": {
        "name": "Japan",
        "base_index": 38764.32,
        "currency": "JPY",
        "base_yield": 0.75,
        "index_series": None,
        "yield_series": None,
        "currency_series": "DEXJPUS",
    },
    "india": {
        "name": "India",
        "base_index": 72458.79,
        "currency": "INR",
        "base_yield": 7.18,
        "index_series": None,
        "yield_series": None,
        "currency_series": "DEXINUS",
    },
}

# Industry flow asset classes
INDUSTRY_ASSETS = [
    {"id": "Stocks", "baseMarketCap": 41000},
    {"id": "Bonds", "baseMarketCap": 25000},
    {"id": "Commodities", "baseMarketCap": 8000},
    {"id": "Crypto", "baseMarketCap": 3500},
    {"id": "Cash", "baseMarketCap": 15000},
]


class APIClient:
    """HTTP client with retry logic."""
    
    def __init__(self, timeout: int = 30):
        self.client = httpx.AsyncClient(timeout=timeout)
        self.max_retries = 3
        self.retry_delay = 2
    
    async def close(self):
        """Close the HTTP client."""
        await self.client.aclose()
    
    async def get_with_retry(self, url: str, params: dict, retries: int = None) -> Optional[dict]:
        """Get request with retry logic."""
        if retries is None:
            retries = self.max_retries
        
        for attempt in range(retries):
            try:
                response = await self.client.get(url, params=params)
                response.raise_for_status()
                return response.json()
            except Exception as e:
                if attempt < retries - 1:
                    logger.warning(f"Request failed (attempt {attempt + 1}/{retries}): {e}. Retrying...")
                    await asyncio.sleep(self.retry_delay * (attempt + 1))
                else:
                    logger.error(f"Request failed after {retries} attempts: {e}")
                    return None
        return None


async def fetch_alpha_vantage_data(symbol: str, is_crypto: bool = False) -> Optional[pd.DataFrame]:
    """Fetch data from Alpha Vantage API."""
    if not ALPHA_VANTAGE_API_KEY:
        logger.warning("Alpha Vantage API key not provided")
        return None
    
    client = APIClient()
    
    try:
        if is_crypto:
            params = {
                "function": "DIGITAL_CURRENCY_DAILY",
                "symbol": symbol,
                "market": "USD",
                "apikey": ALPHA_VANTAGE_API_KEY,
                "datatype": "json"
            }
            time_series_key = "Time Series (Digital Currency Daily)"
        else:
            params = {
                "function": "TIME_SERIES_DAILY",
                "symbol": symbol,
                "apikey": ALPHA_VANTAGE_API_KEY,
                "outputsize": "compact",  # Last 100 data points
                "datatype": "json"
            }
            time_series_key = "Time Series (Daily)"
        
        data = await client.get_with_retry(ALPHA_VANTAGE_BASE_URL, params)
        await client.close()
        
        if not data:
            return None
        
        # Check for API errors
        if "Error Message" in data or "Note" in data or "Information" in data:
            logger.warning(f"Alpha Vantage API error/rate limit for {symbol}")
            return None
        
        if time_series_key not in data:
            logger.warning(f"No time series data for {symbol}")
            return None
        
        # Convert to DataFrame
        records = []
        time_series = data[time_series_key]
        
        for date_str, values in time_series.items():
            try:
                if is_crypto:
                    open_key = "1a. open (USD)"
                    close_key = "4a. close (USD)"
                    volume_key = "5. volume"
                else:
                    open_key = "1. open"
                    close_key = "4. close"
                    volume_key = "5. volume"
                
                records.append({
                    "date": pd.to_datetime(date_str),
                    "open": float(values.get(open_key, 0)),
                    "high": float(values.get("2. high" if not is_crypto else "2a. high (USD)", 0)),
                    "low": float(values.get("3. low" if not is_crypto else "3a. low (USD)", 0)),
                    "close": float(values.get(close_key, 0)),
                    "volume": float(values.get(volume_key, 0)),
                })
            except (KeyError, ValueError) as e:
                logger.warning(f"Error parsing data for {symbol} on {date_str}: {e}")
                continue
        
        if not records:
            return None
        
        df = pd.DataFrame(records)
        df = df.sort_values("date").reset_index(drop=True)
        logger.info(f"Fetched {len(df)} records for {symbol}")
        return df
        
    except Exception as e:
        logger.error(f"Error fetching Alpha Vantage data for {symbol}: {e}")
        await client.close()
        return None


async def fetch_fred_data(series_id: str, days: int = 90) -> Optional[pd.DataFrame]:
    """Fetch data from FRED API."""
    if not FRED_API_KEY:
        logger.warning("FRED API key not provided")
        return None
    
    client = APIClient()
    
    try:
        end_date = datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
        
        params = {
            "series_id": series_id,
            "api_key": FRED_API_KEY,
            "file_type": "json",
            "observation_start": start_date,
            "observation_end": end_date,
            "frequency": "d",
        }
        
        data = await client.get_with_retry(FRED_BASE_URL, params)
        await client.close()
        
        if not data:
            return None
        
        if "error_code" in data:
            logger.error(f"FRED API error: {data.get('error_message', 'Unknown error')}")
            return None
        
        observations = data.get("observations", [])
        if not observations:
            logger.warning(f"No observations for FRED series {series_id}")
            return None
        
        records = []
        for obs in observations:
            if obs.get("value") != ".":
                try:
                    records.append({
                        "date": pd.to_datetime(obs["date"]),
                        "value": float(obs["value"]),
                    })
                except (ValueError, KeyError):
                    continue
        
        if not records:
            return None
        
        df = pd.DataFrame(records)
        df = df.sort_values("date").reset_index(drop=True)
        logger.info(f"Fetched {len(df)} records for FRED series {series_id}")
        return df
        
    except Exception as e:
        logger.error(f"Error fetching FRED data for {series_id}: {e}")
        await client.close()
        return None


def generate_mock_price_data(asset_id: str, days: int = 90) -> pd.DataFrame:
    """Generate mock price data when API fails."""
    logger.info(f"Generating mock price data for {asset_id}")
    asset = ASSETS[asset_id]
    base_price = 100.0
    
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
    prices = [base_price]
    
    for i in range(1, len(dates)):
        change = np.random.normal(0, 0.02)
        prices.append(prices[-1] * (1 + change))
    
    volumes = [np.random.uniform(1_000_000, 10_000_000) for _ in dates]
    
    return pd.DataFrame({
        "date": dates,
        "open": prices,
        "high": [p * 1.01 for p in prices],
        "low": [p * 0.99 for p in prices],
        "close": prices,
        "volume": volumes,
    })


def generate_mock_regional_data(region_id: str, days: int = 90) -> pd.DataFrame:
    """Generate mock regional data when API fails."""
    logger.info(f"Generating mock regional data for {region_id}")
    region = REGIONS[region_id]
    
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
    base_index = region["base_index"]
    base_yield = region["base_yield"]
    
    indices = [base_index]
    for i in range(1, len(dates)):
        change = np.random.normal(0, 0.02)
        indices.append(indices[-1] * (1 + change))
    
    currency_strengths = [1.0 if region_id == "usa" else np.random.uniform(0.75, 1.15) for _ in dates]
    yields = [base_yield * (1 + np.random.normal(0, 0.05)) for _ in dates]
    
    return pd.DataFrame({
        "date": dates,
        "region_id": region_id,
        "stock_index": indices,
        "currency_strength": currency_strengths,
        "bond_yield": yields,
    })


async def fetch_all_data(days: int = 90) -> Dict[str, pd.DataFrame]:
    """Fetch all data from APIs."""
    logger.info("Starting data fetch...")
    
    # Fetch asset prices
    asset_prices = []
    for asset_id, asset_info in ASSETS.items():
        if asset_info.get("crypto"):
            df = await fetch_alpha_vantage_data(asset_info["symbol"], is_crypto=True)
        elif "symbol" in asset_info:
            df = await fetch_alpha_vantage_data(asset_info["symbol"], is_crypto=False)
        else:
            df = None
        
        if df is None or df.empty:
            df = generate_mock_price_data(asset_id, days)
        
        df["asset_id"] = asset_id
        asset_prices.append(df[["date", "asset_id", "close", "volume"]].rename(columns={"close": "price"}))
        await asyncio.sleep(0.5)  # Rate limiting
    
    asset_prices_df = pd.concat(asset_prices, ignore_index=True) if asset_prices else pd.DataFrame()
    
    # Fetch regional data
    regional_data = []
    for region_id, region_info in REGIONS.items():
        index_df = None
        yield_df = None
        currency_df = None
        
        if region_info.get("index_series"):
            index_df = await fetch_fred_data(region_info["index_series"], days)
            await asyncio.sleep(0.3)
        
        if region_info.get("yield_series"):
            yield_df = await fetch_fred_data(region_info["yield_series"], days)
            await asyncio.sleep(0.3)
        
        if region_info.get("currency_series"):
            currency_df = await fetch_fred_data(region_info["currency_series"], days)
            await asyncio.sleep(0.3)
        
        # Combine regional data
        if index_df is not None or yield_df is not None or currency_df is not None:
            all_dates = set()
            if index_df is not None:
                all_dates.update(index_df["date"].tolist())
            if yield_df is not None:
                all_dates.update(yield_df["date"].tolist())
            if currency_df is not None:
                all_dates.update(currency_df["date"].tolist())
            
            dates = sorted(all_dates)
            data = []
            for date in dates:
                stock_index = region_info["base_index"]
                if index_df is not None:
                    idx_data = index_df[index_df["date"] == date]
                    if not idx_data.empty:
                        stock_index = float(idx_data.iloc[0]["value"])
                
                bond_yield = region_info["base_yield"]
                if yield_df is not None:
                    yld_data = yield_df[yield_df["date"] == date]
                    if not yld_data.empty:
                        bond_yield = float(yld_data.iloc[0]["value"])
                
                currency_strength = 1.0 if region_id == "usa" else 0.9
                if currency_df is not None:
                    curr_data = currency_df[currency_df["date"] == date]
                    if not curr_data.empty:
                        exchange_rate = float(curr_data.iloc[0]["value"])
                        if region_id != "usa":
                            currency_strength = max(0.5, min(1.5, 1.0 / exchange_rate if exchange_rate > 0 else 0.9))
                
                data.append({
                    "date": date,
                    "region_id": region_id,
                    "stock_index": stock_index,
                    "currency_strength": currency_strength,
                    "bond_yield": bond_yield,
                })
            
            regional_data.append(pd.DataFrame(data))
        else:
            regional_data.append(generate_mock_regional_data(region_id, days))
    
    regional_df = pd.concat(regional_data, ignore_index=True) if regional_data else pd.DataFrame()
    
    # Generate flow data (mock - no direct API)
    logger.info("Generating flow data (mock)")
    flow_data = []
    dates = pd.date_range(end=datetime.now(), periods=days, freq='D')
    region_ids = list(REGIONS.keys())
    asset_types = ["equities", "bonds", "currency"]
    
    for date in dates:
        num_flows = random.randint(10, 15)
        for _ in range(num_flows):
            source = random.choice(region_ids)
            target = random.choice([r for r in region_ids if r != source])
            asset_type = random.choice(asset_types)
            amount = random.uniform(1_000_000_000, 50_000_000_000)
            
            flow_data.append({
                "date": date,
                "source": source,
                "target": target,
                "amount": amount,
                "asset_type": asset_type,
            })
    
    flow_df = pd.DataFrame(flow_data)
    
    return {
        "asset_prices": asset_prices_df,
        "regional_data": regional_df,
        "flow_data": flow_df,
    }


def generate_global_flow_data(data: Dict[str, pd.DataFrame]) -> dict:
    """Generate global flow data in the format expected by the frontend."""
    regional_df = data["regional_data"]
    flow_df = data["flow_data"]
    
    # Get latest regional metrics
    if regional_df.empty:
        regional_metrics = {
            region_id: {
                "stock_index": region_info["base_index"],
                "currency_strength": 1.0 if region_id == "usa" else 0.9,
                "bond_yield": region_info["base_yield"],
            }
            for region_id, region_info in REGIONS.items()
        }
    else:
        latest_date = regional_df["date"].max()
        latest_data = regional_df[regional_df["date"] == latest_date]
        regional_metrics = {}
        for region_id, region_info in REGIONS.items():
            region_data = latest_data[latest_data["region_id"] == region_id]
            if not region_data.empty:
                row = region_data.iloc[0]
                regional_metrics[region_id] = {
                    "stock_index": row["stock_index"],
                    "currency_strength": row["currency_strength"],
                    "bond_yield": row["bond_yield"],
                }
            else:
                regional_metrics[region_id] = {
                    "stock_index": region_info["base_index"],
                    "currency_strength": 1.0 if region_id == "usa" else 0.9,
                    "bond_yield": region_info["base_yield"],
                }
    
    # Build regions
    regions = []
    for region_id, region_info in REGIONS.items():
        metrics = regional_metrics[region_id]
        
        # Calculate stock change
        region_data = regional_df[regional_df["region_id"] == region_id]
        if len(region_data) > 1:
            latest_index = region_data.iloc[-1]["stock_index"]
            previous_index = region_data.iloc[-2]["stock_index"]
            stock_change = ((latest_index - previous_index) / previous_index) * 100
        else:
            stock_change = 0.0
        
        regions.append({
            "id": region_id,
            "name": region_info["name"],
            "stockIndex": float(metrics["stock_index"]),
            "stockChange": float(stock_change),
            "currency": region_info["currency"],
            "currencyStrength": float(metrics["currency_strength"]),
            "bondYield": float(metrics["bond_yield"]),
        })
    
    # Build flows
    flows = []
    if not flow_df.empty:
        latest_date = flow_df["date"].max()
        latest_flows = flow_df[flow_df["date"] == latest_date]
        
        # Aggregate flows
        flow_groups = latest_flows.groupby(["source", "target", "asset_type"]).agg({
            "amount": "sum"
        }).reset_index()
        
        for _, row in flow_groups.iterrows():
            flows.append({
                "source": row["source"],
                "target": row["target"],
                "amount": float(row["amount"]),
                "assetType": row["asset_type"],
                "netFlowPercent": float(random.uniform(-5.0, 5.0)),
            })
    
    # If no flows, generate some mock flows
    if not flows:
        logger.warning("No flows found, generating mock flows")
        for source in REGIONS.keys():
            for target in REGIONS.keys():
                if source != target and random.random() > 0.7:
                    flows.append({
                        "source": source,
                        "target": target,
                        "amount": float(random.uniform(1_000_000_000, 50_000_000_000)),
                        "assetType": random.choice(["equities", "bonds", "currency"]),
                        "netFlowPercent": float(random.uniform(-5.0, 5.0)),
                    })
    
    return {
        "timestamp": datetime.now().isoformat() + "Z",
        "regions": regions,
        "flows": flows,
    }


def generate_industry_flow_data() -> dict:
    """Generate industry flow data in the format expected by the frontend."""
    nodes = []
    node_flow_data = {}
    
    for asset in INDUSTRY_ASSETS:
        net_flow_pct = round(random.uniform(-5.0, 5.0), 2)
        node_flow_data[asset["id"]] = net_flow_pct
        
        size = round(1 + (net_flow_pct / 100), 4)
        market_cap = round(asset["baseMarketCap"] * (1 + random.uniform(-0.1, 0.1)), 2)
        
        nodes.append({
            "id": asset["id"],
            "size": size,
            "netFlowPct": net_flow_pct,
            "marketCap": market_cap,
        })
    
    # Generate edges
    edges = []
    for i, source_node in enumerate(nodes):
        for target_node in nodes[i+1:]:
            correlation = round(random.uniform(-1.0, 1.0), 4)
            source_net_flow = node_flow_data[source_node["id"]]
            target_net_flow = node_flow_data[target_node["id"]]
            
            # Calculate flow intensity
            normalized_1 = (source_net_flow + 5) / 10
            normalized_2 = (target_net_flow + 5) / 10
            avg_normalized = (normalized_1 + normalized_2) / 2
            flow_intensity = abs(correlation) * avg_normalized
            
            edges.append({
                "source": source_node["id"],
                "target": target_node["id"],
                "correlation": correlation,
                "flowIntensity": round(flow_intensity, 4),
            })
    
    return {
        "timestamp": datetime.now().isoformat() + "Z",
        "nodes": nodes,
        "edges": edges,
    }


def save_json_file(data: dict, filename: str) -> bool:
    """Save data to JSON file."""
    filepath = DATA_DIR / filename
    try:
        with open(filepath, 'w') as f:
            json.dump(data, f, indent=2)
        logger.info(f"Saved {filename} to {filepath}")
        return True
    except Exception as e:
        logger.error(f"Error saving {filename}: {e}")
        return False


def get_file_hash(filepath: Path) -> str:
    """Get MD5 hash of file."""
    try:
        with open(filepath, 'rb') as f:
            return hashlib.md5(f.read()).hexdigest()
    except FileNotFoundError:
        return ""


def git_commit_and_push() -> bool:
    """Commit and push changes to GitHub if data changed."""
    try:
        # Change to project root
        os.chdir(PROJECT_ROOT)
        
        # Check if git is available
        try:
            subprocess.run(["git", "--version"], check=True, capture_output=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("Git not available, skipping commit/push")
            return False
        
        # Check if we're in a git repository
        try:
            subprocess.run(["git", "rev-parse", "--git-dir"], check=True, capture_output=True)
        except subprocess.CalledProcessError:
            logger.warning("Not in a git repository, skipping commit/push")
            return False
        
        # Check for changes
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            check=True
        )
        
        if not result.stdout.strip():
            logger.info("No changes to commit")
            return True
        
        # Add data files
        data_files = list(DATA_DIR.glob("*.json"))
        if not data_files:
            logger.warning("No data files to commit")
            return False
        
        for file in data_files:
            subprocess.run(["git", "add", str(file)], check=True)
        
        # Commit with timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        commit_message = f"Update data {datetime.now().strftime('%Y-%m-%d')}"
        
        subprocess.run(
            ["git", "commit", "-m", commit_message],
            check=True,
            capture_output=True
        )
        logger.info(f"Committed changes: {commit_message}")
        
        # Push to GitHub
        subprocess.run(["git", "push"], check=True, capture_output=True)
        logger.info("Pushed changes to GitHub")
        
        return True
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Git operation failed: {e}")
        if e.stdout:
            logger.error(f"Stdout: {e.stdout.decode()}")
        if e.stderr:
            logger.error(f"Stderr: {e.stderr.decode()}")
        return False
    except Exception as e:
        logger.error(f"Error in git commit/push: {e}")
        return False


async def main():
    """Main function to fetch data, save files, and commit to GitHub."""
    logger.info("=" * 60)
    logger.info("Starting daily data update")
    logger.info("=" * 60)
    
    try:
        # Fetch all data
        data = await fetch_all_data(days=90)
        
        # Generate global flow data
        logger.info("Generating global flow data...")
        global_flow_data = generate_global_flow_data(data)
        
        # Generate industry flow data
        logger.info("Generating industry flow data...")
        industry_flow_data = generate_industry_flow_data()
        
        # Save JSON files
        logger.info("Saving JSON files...")
        global_saved = save_json_file(global_flow_data, "global-flow.json")
        industry_saved = save_json_file(industry_flow_data, "industry-flow.json")
        
        if not global_saved or not industry_saved:
            logger.error("Failed to save some JSON files")
            return False
        
        # Commit and push to GitHub
        logger.info("Committing and pushing to GitHub...")
        git_success = git_commit_and_push()
        
        if git_success:
            logger.info("=" * 60)
            logger.info("Data update completed successfully")
            logger.info("=" * 60)
        else:
            logger.warning("Data update completed but git commit/push failed")
        
        return True
        
    except Exception as e:
        logger.error(f"Error in main: {e}", exc_info=True)
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)

