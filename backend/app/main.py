"""
Main FastAPI application for Money Flow Observatory.
"""

import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import global_flow, industry_flow
from app.core.cache import get_cache
from app.core.data_pipeline import DataPipeline
from app.core.persistence import DataPersistence

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler("money_flow_observatory.log")
    ]
)

logger = logging.getLogger(__name__)


# Global instances
data_pipeline = DataPipeline()
persistence = DataPersistence(data_dir="data")
cache = get_cache()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("Starting Money Flow Observatory API")
    
    # Initialize data pipeline (async)
    logger.info("Initializing data pipeline...")
    try:
        # Pre-fetch some data to warm up the cache
        await data_pipeline.fetch_asset_prices(days=30)
        await data_pipeline.fetch_regional_data(days=30)
        data_pipeline.fetch_flow_data(days=30)
        logger.info("Data pipeline initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing data pipeline: {e}")
        # Continue even if initialization fails - will use mock data
    
    # Schedule periodic data refresh
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.interval import IntervalTrigger
        
        scheduler = AsyncIOScheduler()
        
        # Refresh data every 5 minutes
        scheduler.add_job(
            refresh_data,
            trigger=IntervalTrigger(minutes=5),
            id="refresh_data",
            name="Refresh market data",
            replace_existing=True
        )
        
        # Cleanup cache every hour
        scheduler.add_job(
            cleanup_cache,
            trigger=IntervalTrigger(hours=1),
            id="cleanup_cache",
            name="Cleanup expired cache entries",
            replace_existing=True
        )
        
        scheduler.start()
        app.state.scheduler = scheduler
        logger.info("Scheduler started")
    except ImportError:
        logger.warning("APScheduler not installed, skipping scheduled tasks")
    except Exception as e:
        logger.error(f"Error starting scheduler: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Money Flow Observatory API")
    
    # Shutdown scheduler
    if hasattr(app.state, "scheduler"):
        app.state.scheduler.shutdown()
        logger.info("Scheduler stopped")
    
    # Cleanup
    cache.clear()
    logger.info("Cache cleared")
    
    # Close API clients
    try:
        await data_pipeline.close()
    except Exception as e:
        logger.error(f"Error closing data pipeline: {e}")


# Create FastAPI app
app = FastAPI(
    title="Money Flow Observatory API",
    description="Real-time data engine for correlation and money flow metrics across global financial markets",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
from app.config import settings
cors_origins = [
    "http://localhost:5173",  # Vite default
    "http://localhost:3000",  # React default
    "http://localhost:8080",  # Frontend port
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8080",
    "http://[::1]:8080",  # IPv6 localhost
]
# Add any origins from settings
try:
    cors_origins.extend(settings.cors_origins_list)
except:
    pass

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(cors_origins)),  # Remove duplicates
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(industry_flow.router)
app.include_router(global_flow.router)


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "name": "Money Flow Observatory API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "industry_flow": "/api/industry-flow",
            "global_flow": "/api/global-flow",
            "docs": "/docs",
            "redoc": "/redoc",
        }
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    cache_size = 0
    if hasattr(cache, "_cache"):
        cache_size = len(cache._cache)
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "cache_size": cache_size,
    }


async def refresh_data():
    """
    Background task to refresh market data.
    """
    try:
        logger.info("Refreshing market data...")
        
        # Fetch fresh data (async)
        price_data = await data_pipeline.fetch_asset_prices(days=90)
        regional_data = await data_pipeline.fetch_regional_data(days=90)
        flow_data = data_pipeline.fetch_flow_data(days=90)
        
        # Clean data
        price_data = data_pipeline.clean_data(price_data)
        regional_data = data_pipeline.clean_data(regional_data)
        flow_data = data_pipeline.clean_data(flow_data)
        
        # Persist data
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        persistence.save_to_parquet(price_data, f"asset_prices_{timestamp}")
        persistence.save_to_parquet(regional_data, f"regional_data_{timestamp}")
        persistence.save_to_parquet(flow_data, f"flow_data_{timestamp}")
        
        # Clear cache to force refresh on next request
        cache.clear()
        
        logger.info("Market data refreshed successfully")
    except Exception as e:
        logger.error(f"Error refreshing data: {e}", exc_info=True)


def cleanup_cache():
    """
    Background task to cleanup expired cache entries.
    """
    try:
        if hasattr(cache, "cleanup_expired"):
            removed = cache.cleanup_expired()
            logger.info(f"Cache cleanup completed: {removed} entries removed")
    except Exception as e:
        logger.error(f"Error cleaning cache: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)

