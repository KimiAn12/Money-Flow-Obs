"""
Metrics computation module for correlation, flow intensity, and volatility-weighted scores.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class MetricsCalculator:
    """Calculates financial metrics including correlations, flow intensity, and volatility."""
    
    def __init__(self, window_size: int = 30):
        """
        Initialize metrics calculator.
        
        Args:
            window_size: Rolling window size for correlation calculations (days)
        """
        self.window_size = window_size
        logger.info(f"MetricsCalculator initialized with window_size={window_size}")
    
    def calculate_correlation_matrix(
        self, 
        price_data: pd.DataFrame,
        method: str = "pearson"
    ) -> pd.DataFrame:
        """
        Calculate correlation matrix between assets.
        
        Args:
            price_data: DataFrame with columns: date, asset_id, price
            method: Correlation method ('pearson', 'spearman', 'kendall')
            
        Returns:
            Correlation matrix DataFrame
        """
        logger.info(f"Calculating {method} correlation matrix")
        
        # Remove duplicates if any (keep last occurrence)
        price_data = price_data.drop_duplicates(subset=["date", "asset_id"], keep="last")
        
        # Pivot data to have assets as columns
        pivot_data = price_data.pivot_table(index="date", columns="asset_id", values="price", aggfunc="last")
        
        # Calculate returns
        returns = pivot_data.pct_change().dropna()
        
        # Calculate correlation matrix
        correlation_matrix = returns.corr(method=method)
        
        logger.info(f"Correlation matrix calculated: {correlation_matrix.shape}")
        return correlation_matrix
    
    def calculate_rolling_correlation(
        self,
        price_data: pd.DataFrame,
        asset1: str,
        asset2: str,
        window: int = None
    ) -> float:
        """
        Calculate rolling correlation between two assets.
        
        Args:
            price_data: DataFrame with columns: date, asset_id, price
            asset1: First asset ID
            asset2: Second asset ID
            window: Rolling window size (defaults to self.window_size)
            
        Returns:
            Rolling correlation value
        """
        if window is None:
            window = self.window_size
        
        logger.debug(f"Calculating rolling correlation between {asset1} and {asset2}")
        
        # Filter data for the two assets
        asset1_data = price_data[price_data["asset_id"] == asset1].set_index("date")["price"]
        asset2_data = price_data[price_data["asset_id"] == asset2].set_index("date")["price"]
        
        # Align dates
        aligned_data = pd.DataFrame({
            asset1: asset1_data,
            asset2: asset2_data,
        }).dropna()
        
        if len(aligned_data) < window:
            window = len(aligned_data)
        
        if window < 2:
            return 0.0
        
        # Calculate returns
        returns = aligned_data.pct_change().dropna()
        
        if len(returns) < window:
            return returns[asset1].corr(returns[asset2])
        
        # Get most recent window
        recent_returns = returns.tail(window)
        correlation = recent_returns[asset1].corr(recent_returns[asset2])
        
        # Handle NaN
        if pd.isna(correlation):
            return 0.0
        
        return float(correlation)
    
    def calculate_flow_intensity(
        self,
        market_caps: Dict[str, float],
        previous_market_caps: Dict[str, float] = None
    ) -> Dict[str, float]:
        """
        Calculate flow intensity metric (normalized change in market cap).
        
        Args:
            market_caps: Current market capitalizations
            previous_market_caps: Previous market capitalizations (optional)
            
        Returns:
            Dictionary of flow intensity values for each asset
        """
        logger.info("Calculating flow intensity")
        
        if previous_market_caps is None:
            # Use a simple random walk approximation
            flow_intensity = {
                asset: np.random.normal(0, 0.02) 
                for asset in market_caps.keys()
            }
        else:
            flow_intensity = {}
            total_previous = sum(previous_market_caps.values())
            total_current = sum(market_caps.values())
            
            for asset in market_caps.keys():
                if asset in previous_market_caps and previous_market_caps[asset] > 0:
                    # Calculate percentage change in market cap share
                    prev_share = previous_market_caps[asset] / total_previous
                    curr_share = market_caps[asset] / total_current
                    flow_intensity[asset] = (curr_share - prev_share) / prev_share * 100
                else:
                    flow_intensity[asset] = 0.0
        
        return flow_intensity
    
    def calculate_volatility(
        self,
        price_data: pd.DataFrame,
        asset_id: str,
        window: int = None
    ) -> float:
        """
        Calculate volatility (standard deviation of returns) for an asset.
        
        Args:
            price_data: DataFrame with columns: date, asset_id, price
            asset_id: Asset identifier
            window: Rolling window size (defaults to self.window_size)
            
        Returns:
            Volatility value (annualized)
        """
        if window is None:
            window = self.window_size
        
        logger.debug(f"Calculating volatility for {asset_id}")
        
        asset_data = price_data[price_data["asset_id"] == asset_id].sort_values("date")
        
        if len(asset_data) < 2:
            return 0.0
        
        # Calculate returns
        asset_data = asset_data.set_index("date")
        returns = asset_data["price"].pct_change().dropna()
        
        if len(returns) < 2:
            return 0.0
        
        # Use most recent window
        if len(returns) > window:
            returns = returns.tail(window)
        
        # Calculate standard deviation and annualize (assuming daily data)
        volatility = returns.std() * np.sqrt(252)  # Annualized
        
        return float(volatility) if not pd.isna(volatility) else 0.0
    
    def calculate_volatility_weighted_flow_score(
        self,
        correlation: float,
        flow_intensity: float,
        volatility: float,
        base_volatility: float = 0.15
    ) -> float:
        """
        Calculate volatility-weighted flow score.
        
        Args:
            correlation: Correlation between assets
            flow_intensity: Flow intensity value
            volatility: Current volatility
            base_volatility: Base volatility for normalization
            
        Returns:
            Volatility-weighted flow score (0-1)
        """
        # Normalize volatility
        vol_ratio = min(volatility / base_volatility, 2.0)  # Cap at 2x
        
        # Calculate score
        # Higher volatility = more active capital movement
        # Higher correlation = stronger relationship
        # Higher flow intensity = more capital flow
        score = abs(correlation) * abs(flow_intensity) / 100 * vol_ratio
        
        # Normalize to 0-1 range
        score = min(max(score, 0.0), 1.0)
        
        return score
    
    def calculate_net_flow_percentage(
        self,
        current_amount: float,
        previous_amount: float
    ) -> float:
        """
        Calculate net flow as percentage.
        
        Args:
            current_amount: Current flow amount
            previous_amount: Previous flow amount
            
        Returns:
            Net flow percentage
        """
        if previous_amount == 0:
            return 0.0
        
        return ((current_amount - previous_amount) / previous_amount) * 100
    
    def calculate_bilateral_flows(
        self,
        flow_data: pd.DataFrame,
        source: str,
        target: str
    ) -> Tuple[float, float]:
        """
        Calculate bilateral flow values between two regions.
        
        Args:
            flow_data: DataFrame with columns: date, source, target, amount
            source: Source region ID
            target: Target region ID
            
        Returns:
            Tuple of (outflow from source to target, inflow from target to source)
        """
        logger.debug(f"Calculating bilateral flows: {source} <-> {target}")
        
        # Get latest date
        latest_date = flow_data["date"].max()
        latest_flows = flow_data[flow_data["date"] == latest_date]
        
        # Outflow: source -> target
        outflow = latest_flows[
            (latest_flows["source"] == source) & (latest_flows["target"] == target)
        ]["amount"].sum()
        
        # Inflow: target -> source
        inflow = latest_flows[
            (latest_flows["source"] == target) & (latest_flows["target"] == source)
        ]["amount"].sum()
        
        return float(outflow), float(inflow)
    
    def generate_insights(
        self,
        correlation_matrix: pd.DataFrame,
        flow_intensity: Dict[str, float],
        market_caps: Dict[str, float]
    ) -> List[str]:
        """
        Generate human-readable insights from the data.
        
        Args:
            correlation_matrix: Correlation matrix between assets
            flow_intensity: Flow intensity values
            market_caps: Current market capitalizations
            
        Returns:
            List of insight strings
        """
        insights = []
        
        # Find strongest correlations
        if not correlation_matrix.empty:
            # Get upper triangle (avoid duplicates)
            mask = np.triu(np.ones_like(correlation_matrix.values, dtype=bool), k=1)
            masked_matrix = correlation_matrix.where(mask)
            
            # Stack and convert to DataFrame manually
            # Clear index names to avoid conflicts
            masked_matrix.index.name = None
            masked_matrix.columns.name = None
            stacked = masked_matrix.stack()
            correlations = pd.DataFrame({
                "asset1": [str(x) for x in stacked.index.get_level_values(0)],
                "asset2": [str(x) for x in stacked.index.get_level_values(1)],
                "correlation": stacked.values
            })
            
            # Strongest positive correlation
            strongest_pos = correlations.nlargest(1, "correlation")
            if not strongest_pos.empty:
                row = strongest_pos.iloc[0]
                insights.append(
                    f"{row['asset1'].title()} shows strongest positive correlation "
                    f"with {row['asset2'].title()} ({row['correlation']:.2f})"
                )
            
            # Strongest negative correlation
            strongest_neg = correlations.nsmallest(1, "correlation")
            if not strongest_neg.empty:
                row = strongest_neg.iloc[0]
                insights.append(
                    f"{row['asset1'].title()} shows strongest inverse correlation "
                    f"with {row['asset2'].title()} ({row['correlation']:.2f})"
                )
        
        # Flow intensity insights
        if flow_intensity:
            max_flow = max(flow_intensity.items(), key=lambda x: abs(x[1]))
            if abs(max_flow[1]) > 5:
                direction = "outflows" if max_flow[1] < 0 else "inflows"
                insights.append(
                    f"{max_flow[0].title()} shows {direction} of {abs(max_flow[1]):.1f}% "
                    f"vs last period"
                )
        
        # Market cap insights
        if market_caps:
            total_cap = sum(market_caps.values())
            largest_asset = max(market_caps.items(), key=lambda x: x[1])
            share = (largest_asset[1] / total_cap) * 100
            insights.append(
                f"{largest_asset[0].title()} represents {share:.1f}% of total market "
                f"capitalization"
            )
        
        return insights

