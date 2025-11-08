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
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]
    
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
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True
    }


# Global settings instance
settings = Settings()

