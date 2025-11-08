# Daily Data Refresh Setup

## Overview

The Money Flow Observatory backend now fetches data from external APIs **once per day at 5:00 PM** instead of on every request. This reduces API calls, prevents rate limiting, and improves performance.

## How It Works

### 1. Scheduled Daily Refresh
- **Schedule**: Every day at 5:00 PM (17:00)
- **Task**: Fetches all data from external APIs (Alpha Vantage, FRED, etc.)
- **Storage**: Saves data to persistent storage (Parquet files)

### 2. Data Persistence
- Data is saved to the `data/` directory as Parquet files:
  - `asset_prices_latest.parquet`
  - `regional_data_latest.parquet`
  - `flow_data_latest.parquet`
- Last refresh timestamp is stored in `data/last_refresh.txt`

### 3. API Endpoints Behavior
- **Default**: API endpoints serve data from persistent storage (no API calls)
- **No Manual Refresh**: The `refresh` parameter is deprecated - data can ONLY be refreshed at the scheduled 5pm time
- **No Data Available**: If no persisted data exists, the endpoint returns a 503 error asking to wait for the 5pm refresh
- **Cache**: Responses are cached for 24 hours

### 4. Startup Behavior
- On server startup, persisted data is automatically loaded if available
- If no persisted data exists, the endpoint will return an error until the next 5pm scheduled refresh
- Data will ONLY be fetched at the scheduled 5pm time, not on first request

## Configuration

### Environment Variables
- `DATA_DIR`: Directory for storing data files (default: `data`)
- `CACHE_TTL`: Cache time-to-live in seconds (default: `86400` = 24 hours)
- `USE_REAL_DATA`: Enable/disable real API data fetching (default: `true`)

### Scheduler Settings
The daily refresh is scheduled using APScheduler with a cron trigger:
```python
CronTrigger(hour=17, minute=0)  # 5pm daily
```

## Manual Refresh

**Manual refresh is NOT available.** Data can ONLY be refreshed at the scheduled 5pm time. This ensures:
- Predictable API usage
- No rate limit issues
- Consistent data refresh schedule
- Cost control

## Logs

The scheduler logs all refresh activities:
- Startup: "Scheduler started - Daily refresh scheduled for 5pm"
- Daily refresh: "Starting daily data refresh (scheduled at 5pm)..."
- Completion: "Daily data refresh completed successfully"

## Benefits

1. **Reduced API Calls**: Only fetch data once per day instead of on every request
2. **Rate Limit Prevention**: Avoid hitting API rate limits
3. **Faster Response Times**: Serve data from cache/persistent storage
4. **Cost Reduction**: Fewer API calls = lower costs
5. **Reliability**: Data persists even if APIs are temporarily unavailable

## Troubleshooting

### Data Not Refreshing
- Check scheduler logs for errors
- Verify APScheduler is installed: `pip install apscheduler`
- Check system timezone (scheduler uses server's local time)

### No Data on First Request
- If no persisted data exists, the endpoint returns a 503 error with message: "Data not available yet. Data is refreshed daily at 5pm. Please wait for the scheduled refresh."
- Data will ONLY be available after the next 5pm scheduled refresh
- No API calls will be made until the scheduled refresh time

### Force Refresh
- **Manual refresh is disabled** - data can ONLY be refreshed at 5pm
- To get fresh data, wait for the next scheduled 5pm refresh
- If you need to reset data, delete the `data/` directory - but data will only be populated at the next 5pm refresh

