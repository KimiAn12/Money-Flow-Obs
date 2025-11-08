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
from app.config import settings
from app.core.cache import get_cache
from app.core.data_pipeline import DataPipeline
from app.core.data_refresh_service import DataRefreshService
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
persistence = DataPersistence(data_dir=settings.DATA_DIR)
cache = get_cache(default_ttl=settings.CACHE_TTL)
data_refresh_service = DataRefreshService()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for startup and shutdown events.
    """
    # Startup
    logger.info("Starting Money Flow Observatory API")
    
    # Load persisted data if available
    logger.info("Loading persisted data...")
    try:
        persisted_data = data_refresh_service.load_persisted_data()
        if any(persisted_data.values()):
            logger.info("Loaded persisted data from disk")
        else:
            logger.info("No persisted data found, will fetch on first request")
    except Exception as e:
        logger.error(f"Error loading persisted data: {e}")
    
    # Schedule daily data refresh at 5pm
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        from apscheduler.triggers.cron import CronTrigger
        
        scheduler = AsyncIOScheduler()
        
        # Refresh data daily at 5pm
        scheduler.add_job(
            daily_data_refresh,
            trigger=CronTrigger(hour=17, minute=0),  # 5pm daily
            id="daily_data_refresh",
            name="Daily data refresh at 5pm",
            replace_existing=True
        )
        
        # Cleanup cache every hour (async function)
        scheduler.add_job(
            cleanup_cache_async,
            trigger=CronTrigger(minute=0),  # Every hour at minute 0
            id="cleanup_cache",
            name="Cleanup expired cache entries",
            replace_existing=True
        )
        
        scheduler.start()
        app.state.scheduler = scheduler
        logger.info("Scheduler started - Daily refresh scheduled for 5pm")
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
        await data_refresh_service.close()
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


async def daily_data_refresh():
    """
    Daily background task to refresh market data from APIs at 5pm.
    """
    try:
        logger.info("Starting daily data refresh (scheduled at 5pm)...")
        success = await data_refresh_service.refresh_all_data()
        
        if success:
            # Clear cache to force refresh on next request
            cache.clear()
            logger.info("Daily data refresh completed successfully")
        else:
            logger.error("Daily data refresh failed")
    except Exception as e:
        logger.error(f"Error in daily data refresh: {e}", exc_info=True)


async def cleanup_cache_async():
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

