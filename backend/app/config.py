"""
Configuration settings for the Money Flow Observatory backend.
"""

import os
from typing import List

try:
    from pydantic_settings import BaseSettings
except ImportError:
    # Fallback for older pydantic versions
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings."""
    
    # API Settings
    API_TITLE: str = "Money Flow Observatory API"
    API_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # CORS Settings
    CORS_ORIGINS: str = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,http://localhost:8080,http://127.0.0.1:8080"
    )
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    # Data Settings
    DATA_DIR: str = "data"
    CACHE_TTL: int = 300  # 5 minutes
    DATA_REFRESH_INTERVAL: int = 5  # minutes
    
    # Metrics Settings
    CORRELATION_WINDOW: int = 30  # days
    DEFAULT_HISTORICAL_DAYS: int = 90
    
    # Redis Settings (optional)
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    USE_REDIS: bool = os.getenv("USE_REDIS", "false").lower() == "true"
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE: str = "money_flow_observatory.log"
    
    # External API Keys
    ALPHA_VANTAGE_API_KEY: str = os.getenv("ALPHA_VANTAGE_API_KEY", "")
    FRED_API_KEY: str = os.getenv("FRED_API_KEY", "")
    
    # API Settings
    USE_REAL_DATA: bool = os.getenv("USE_REAL_DATA", "true").lower() == "true"
    API_REQUEST_TIMEOUT: int = 30  # seconds
    API_RETRY_ATTEMPTS: int = 3
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }


# Global settings instance
settings = Settings()

