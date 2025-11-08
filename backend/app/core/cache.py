"""
Caching layer for API responses and computed metrics.
Supports both in-memory caching and Redis (optional).
"""

import logging
import pickle
from datetime import datetime, timedelta
from typing import Any, Optional

logger = logging.getLogger(__name__)


class InMemoryCache:
    """Simple in-memory cache with TTL support."""
    
    def __init__(self, default_ttl: int = 300):
        """
        Initialize in-memory cache.
        
        Args:
            default_ttl: Default time-to-live in seconds
        """
        self._cache: dict = {}
        self.default_ttl = default_ttl
        logger.info(f"InMemoryCache initialized with TTL={default_ttl}s")
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        if key not in self._cache:
            return None
        
        value, expiry = self._cache[key]
        
        if datetime.now() > expiry:
            del self._cache[key]
            logger.debug(f"Cache key '{key}' expired")
            return None
        
        logger.debug(f"Cache hit for key '{key}'")
        return value
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """
        Set value in cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (defaults to self.default_ttl)
        """
        if ttl is None:
            ttl = self.default_ttl
        
        expiry = datetime.now() + timedelta(seconds=ttl)
        self._cache[key] = (value, expiry)
        logger.debug(f"Cached key '{key}' with TTL={ttl}s")
    
    def delete(self, key: str) -> None:
        """Delete key from cache."""
        if key in self._cache:
            del self._cache[key]
            logger.debug(f"Deleted cache key '{key}'")
    
    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
        logger.info("Cache cleared")
    
    def cleanup_expired(self) -> int:
        """
        Remove expired entries from cache.
        
        Returns:
            Number of entries removed
        """
        now = datetime.now()
        expired_keys = [
            key for key, (_, expiry) in self._cache.items()
            if now > expiry
        ]
        
        for key in expired_keys:
            del self._cache[key]
        
        if expired_keys:
            logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")
        
        return len(expired_keys)


class RedisCache:
    """Redis-based cache (optional, requires redis package)."""
    
    def __init__(self, redis_client, default_ttl: int = 300):
        """
        Initialize Redis cache.
        
        Args:
            redis_client: Redis client instance
            default_ttl: Default time-to-live in seconds
        """
        self.redis = redis_client
        self.default_ttl = default_ttl
        logger.info(f"RedisCache initialized with TTL={default_ttl}s")
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache."""
        try:
            value = self.redis.get(key)
            if value is None:
                return None
            
            logger.debug(f"Redis cache hit for key '{key}'")
            return pickle.loads(value)
        except Exception as e:
            logger.error(f"Error getting from Redis cache: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """Set value in Redis cache."""
        try:
            if ttl is None:
                ttl = self.default_ttl
            
            serialized = pickle.dumps(value)
            self.redis.setex(key, ttl, serialized)
            logger.debug(f"Cached key '{key}' in Redis with TTL={ttl}s")
        except Exception as e:
            logger.error(f"Error setting Redis cache: {e}")
    
    def delete(self, key: str) -> None:
        """Delete key from Redis cache."""
        try:
            self.redis.delete(key)
            logger.debug(f"Deleted Redis cache key '{key}'")
        except Exception as e:
            logger.error(f"Error deleting from Redis cache: {e}")
    
    def clear(self) -> None:
        """Clear all cache entries (use with caution)."""
        try:
            self.redis.flushdb()
            logger.info("Redis cache cleared")
        except Exception as e:
            logger.error(f"Error clearing Redis cache: {e}")


# Global cache instance
_cache_instance: Optional[InMemoryCache] = None


def get_cache(default_ttl: int = 86400) -> InMemoryCache:
    """
    Get the global cache instance.
    
    Args:
        default_ttl: Default TTL in seconds (default: 86400 = 24 hours)
    """
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = InMemoryCache(default_ttl=default_ttl)
    return _cache_instance


def init_redis_cache(redis_url: str = "redis://localhost:6379/0") -> RedisCache:
    """
    Initialize Redis cache (optional).
    
    Args:
        redis_url: Redis connection URL
        
    Returns:
        RedisCache instance
    """
    try:
        import redis
        redis_client = redis.from_url(redis_url)
        redis_client.ping()  # Test connection
        logger.info("Redis cache initialized successfully")
        return RedisCache(redis_client)
    except ImportError:
        logger.warning("Redis package not installed, using in-memory cache")
        return None
    except Exception as e:
        logger.warning(f"Failed to connect to Redis: {e}, using in-memory cache")
        return None

