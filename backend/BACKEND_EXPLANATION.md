# Money Flow Observatory Backend - Complete Explanation

## Overview

The Money Flow Observatory backend is a **FastAPI-based REST API** that serves financial market data for visualization. It's designed to fetch data from external APIs **once per day at 5pm** and serve it from persistent storage, minimizing API calls and preventing rate limiting.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                       │
│                      (main.py)                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ API Routes   │    │   Scheduler  │    │   Cache      │  │
│  │              │    │   (5pm job)  │    │   (24h TTL)  │  │
│  │ - global_flow│    │              │    │              │  │
│  │ - industry_  │    │  APScheduler │    │  In-Memory   │  │
│  │   flow       │    │  CronTrigger │    │  or Redis    │  │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘  │
│         │                    │                    │          │
│         └────────────────────┼────────────────────┘          │
│                              │                               │
│         ┌────────────────────▼────────────────────┐          │
│         │     Data Refresh Service                 │          │
│         │  (ONLY pulls from APIs at 5pm)          │          │
│         └────────────────────┬────────────────────┘          │
│                              │                               │
│         ┌────────────────────▼────────────────────┐          │
│         │        Data Pipeline                     │          │
│         │  - fetch_asset_prices()                  │          │
│         │  - fetch_regional_data()                 │          │
│         │  - fetch_flow_data()                     │          │
│         └────────────────────┬────────────────────┘          │
│                              │                               │
│         ┌────────────────────▼────────────────────┐          │
│         │      API Clients                         │          │
│         │  - AlphaVantageClient                    │          │
│         │  - FREDClient                            │          │
│         └────────────────────┬────────────────────┘          │
│                              │                               │
│                              ▼                               │
│                    External APIs                             │
│              (Alpha Vantage, FRED)                           │
│                                                               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           Data Persistence Layer                     │    │
│  │  - Saves to Parquet files                            │    │
│  │  - Loads from disk on startup                        │    │
│  │  - Stores in data/ directory                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
backend/
├── app/
│   ├── main.py                 # FastAPI app, scheduler setup, lifecycle
│   ├── config.py               # Configuration settings (env vars)
│   │
│   ├── api/                    # API endpoints
│   │   ├── global_flow.py      # Global market flow endpoints
│   │   └── industry_flow.py    # Industry flow endpoints (mock data)
│   │
│   ├── core/                   # Core business logic
│   │   ├── data_pipeline.py    # Data fetching & processing
│   │   ├── data_refresh_service.py  # Scheduled data refresh (5pm)
│   │   ├── api_clients.py      # External API clients (Alpha Vantage, FRED)
│   │   ├── metrics.py          # Correlation & flow calculations
│   │   ├── cache.py            # Caching layer (in-memory/Redis)
│   │   └── persistence.py      # File persistence (Parquet/CSV)
│   │
│   └── models/
│       └── schemas.py          # Pydantic models (data structures)
│
├── data/                       # Persistent data storage
│   ├── asset_prices_latest.parquet
│   ├── regional_data_latest.parquet
│   ├── flow_data_latest.parquet
│   ├── last_refresh.txt        # Timestamp of last refresh
│   └── data_metadata.json      # Metadata about stored data
│
├── requirements.txt            # Python dependencies
├── run.py                      # Entry point
└── README.md                   # Documentation
```

## Core Components

### 1. **main.py** - Application Entry Point

**Purpose**: FastAPI application setup, scheduler configuration, and lifecycle management.

**Key Features**:
- **FastAPI App**: Creates the main application instance
- **CORS Middleware**: Allows frontend to make requests
- **Lifespan Management**: Handles startup and shutdown
- **Scheduler Setup**: Configures daily 5pm data refresh
- **Data Loading**: Loads persisted data on startup

**Key Functions**:
- `lifespan()`: Startup/shutdown logic
- `daily_data_refresh()`: Scheduled task that runs at 5pm
- `cleanup_cache_async()`: Hourly cache cleanup

**Endpoints**:
- `GET /`: Root endpoint (API info)
- `GET /health`: Health check

### 2. **config.py** - Configuration

**Purpose**: Centralized configuration management using Pydantic Settings.

**Key Settings**:
- `DATA_DIR`: Directory for data files (default: `data`)
- `CACHE_TTL`: Cache time-to-live (default: 86400 = 24 hours)
- `USE_REAL_DATA`: Enable/disable real API data (default: `true`)
- `ALPHA_VANTAGE_API_KEY`: API key for Alpha Vantage
- `FRED_API_KEY`: API key for FRED
- `CORS_ORIGINS`: Allowed CORS origins

**Configuration Source**: Environment variables or `.env` file

### 3. **data_pipeline.py** - Data Processing Engine

**Purpose**: Fetches, processes, and transforms financial market data.

**Key Features**:
- **Asset Definitions**: Stocks, Bonds, Commodities, Crypto, Cash
- **Region Definitions**: USA, China, Europe, Japan, India
- **API Integration**: Alpha Vantage (stocks, crypto), FRED (economic data)
- **Mock Data Fallback**: Generates mock data if APIs fail
- **Data Cleaning**: Removes duplicates, invalid values, NaN

**Key Methods**:
- `fetch_asset_prices(days)`: Fetches historical asset prices
- `fetch_regional_data(days)`: Fetches regional market data
- `fetch_flow_data(days)`: Generates flow data between regions
- `clean_data(df)`: Cleans and validates data
- `get_current_regional_indices()`: Gets latest regional metrics

**Data Sources**:
- **Alpha Vantage**: Stock prices (SPY, TLT, GLD), Crypto (BTC)
- **FRED**: Economic indicators (SP500, DGS10, currency rates)
- **Mock Data**: Fallback when APIs unavailable or rate-limited

### 4. **data_refresh_service.py** - Scheduled Data Refresh

**Purpose**: Manages daily data refresh at 5pm. **THIS IS THE ONLY PLACE THAT PULLS FROM APIs**.

**Key Features**:
- **Scheduled Refresh**: Fetches all data from APIs at 5pm
- **Data Persistence**: Saves data to Parquet files
- **Metadata Tracking**: Tracks last refresh time
- **Data Loading**: Loads persisted data on demand

**Key Methods**:
- `refresh_all_data()`: Fetches all data from APIs and saves to disk
- `load_persisted_data()`: Loads data from disk into memory
- `get_last_refresh_time()`: Returns timestamp of last refresh
- `save_last_refresh_time()`: Saves refresh timestamp

**Storage**:
- Saves to: `data/asset_prices_latest.parquet`, `data/regional_data_latest.parquet`, `data/flow_data_latest.parquet`
- Metadata: `data/last_refresh.txt`, `data/data_metadata.json`

### 5. **api_clients.py** - External API Clients

**Purpose**: Handles communication with external data APIs.

**Classes**:
- **AlphaVantageClient**: Fetches stock and crypto data
  - `get_time_series_daily(symbol)`: Daily stock prices
  - `get_crypto_daily(symbol)`: Daily crypto prices
- **FREDClient**: Fetches economic data
  - `get_series(series_id)`: Economic indicators
  - `get_multiple_series(series_ids)`: Batch fetch

**Features**:
- Rate limiting handling
- Error handling and retries
- Async HTTP requests
- Automatic fallback to mock data on failure

### 6. **cache.py** - Caching Layer

**Purpose**: Caches API responses and computed metrics.

**Classes**:
- **InMemoryCache**: Simple in-memory cache with TTL
- **RedisCache**: Redis-based cache (optional)

**Features**:
- TTL-based expiration (24 hours default)
- Automatic cleanup of expired entries
- Supports both in-memory and Redis

### 7. **persistence.py** - Data Persistence

**Purpose**: Saves and loads data to/from disk.

**Key Methods**:
- `save_to_parquet(df, filename)`: Saves DataFrame to Parquet
- `load_from_parquet(filename)`: Loads DataFrame from Parquet
- `save_to_csv(df, filename)`: Saves DataFrame to CSV
- `save_snapshot(data, prefix)`: Saves data snapshot with timestamp
- `cleanup_old_files(days)`: Removes old files

**Storage Format**: Parquet files (compressed, efficient)

### 8. **metrics.py** - Metrics Calculation

**Purpose**: Computes financial metrics (correlations, flows, etc.).

**Key Calculations**:
- Correlation matrices
- Net flow percentages
- Flow intensity
- Volatility metrics

### 9. **API Endpoints**

#### **global_flow.py** - Global Market Flow API

**Endpoint**: `GET /api/global-flow`

**Purpose**: Returns regional market data and flows between regions.

**Behavior**:
- **ONLY serves persisted data** (no API calls)
- Returns 503 error if no persisted data exists
- Caches responses for 24 hours
- Supports time ranges (1D, 1W, 1M, 3M, 1Y)

**Response**: `GlobalFlowData` with regions and flows

#### **industry_flow.py** - Industry Flow API

**Endpoint**: `GET /api/industry-flow`

**Purpose**: Returns asset class flow data (generates mock data).

**Behavior**:
- Generates random data on each request
- No API calls or data persistence
- Simulates market movements

**Response**: `IndustryFlowData` with nodes and edges

## Data Flow

### Daily Refresh Flow (5pm)

```
1. Scheduler triggers daily_data_refresh() at 5pm
   │
2. Calls data_refresh_service.refresh_all_data()
   │
3. Fetches data from APIs:
   ├─> fetch_asset_prices() → Alpha Vantage/FRED
   ├─> fetch_regional_data() → FRED
   └─> fetch_flow_data() → Mock data (no API)
   │
4. Cleans data (remove duplicates, invalid values)
   │
5. Saves to persistent storage:
   ├─> asset_prices_latest.parquet
   ├─> regional_data_latest.parquet
   └─> flow_data_latest.parquet
   │
6. Saves metadata (refresh time, record counts)
   │
7. Clears cache to force refresh on next request
```

### API Request Flow

```
1. Client requests GET /api/global-flow
   │
2. Check cache:
   ├─> If cached → return cached response
   └─> If not cached → continue
   │
3. Load persisted data from disk:
   ├─> regional_data_latest.parquet
   └─> flow_data_latest.parquet
   │
4. If no persisted data:
   └─> Return 503 error (wait for 5pm refresh)
   │
5. If persisted data exists:
   ├─> Process data (calculate metrics)
   ├─> Build response (regions, flows)
   ├─> Cache response (24 hours)
   └─> Return response
```

## Scheduled Tasks

### Daily Data Refresh (5pm)

- **Schedule**: Every day at 5:00 PM (17:00)
- **Trigger**: `CronTrigger(hour=17, minute=0)`
- **Function**: `daily_data_refresh()`
- **Action**: Fetches all data from APIs and saves to disk
- **Logs**: "Starting daily data refresh (scheduled at 5pm)..."

### Cache Cleanup (Hourly)

- **Schedule**: Every hour at minute 0
- **Trigger**: `CronTrigger(minute=0)`
- **Function**: `cleanup_cache_async()`
- **Action**: Removes expired cache entries
- **Logs**: "Cache cleanup completed: X entries removed"

## Configuration

### Environment Variables

```env
# API Keys
ALPHA_VANTAGE_API_KEY=your_key_here
FRED_API_KEY=your_key_here

# Data Settings
DATA_DIR=data
CACHE_TTL=86400  # 24 hours
USE_REAL_DATA=true

# CORS
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Redis (optional)
USE_REDIS=false
REDIS_URL=redis://localhost:6379/0

# Logging
LOG_LEVEL=INFO
LOG_FILE=money_flow_observatory.log
```

## Key Design Decisions

### 1. **Daily Refresh at 5pm Only**

- **Why**: Minimize API calls, prevent rate limiting, reduce costs
- **How**: Scheduler triggers refresh, endpoints only serve persisted data
- **Benefit**: Predictable API usage, no unexpected API calls

### 2. **Persistent Storage**

- **Why**: Fast access, data survives server restarts
- **How**: Parquet files in `data/` directory
- **Benefit**: No API calls on requests, fast response times

### 3. **Cache Layer**

- **Why**: Reduce computation, faster responses
- **How**: In-memory cache with 24-hour TTL
- **Benefit**: Instant responses for repeated requests

### 4. **Mock Data Fallback**

- **Why**: Continue working when APIs fail
- **How**: Generate realistic mock data if APIs unavailable
- **Benefit**: System always returns data, never fails

### 5. **Error Handling**

- **Why**: Graceful degradation, better user experience
- **How**: Try real APIs, fallback to mock, log errors
- **Benefit**: System is resilient to API failures

## API Usage Examples

### Get Global Flow Data

```bash
# Get data for 1 month time range
curl "http://localhost:8001/api/global-flow?timeRange=1M"

# Response includes:
# - regions: List of regional market data
# - flows: List of flows between regions
# - timestamp: When data was last refreshed
```

### Get Industry Flow Data

```bash
# Get industry flow data
curl "http://localhost:8001/api/industry-flow?timeRange=1W"

# Response includes:
# - nodes: Asset classes (Stocks, Bonds, etc.)
# - edges: Flows between assets
# - timestamp: Current timestamp
```

## Data Storage

### Parquet Files

- **Format**: Parquet (columnar, compressed)
- **Location**: `backend/data/`
- **Files**:
  - `asset_prices_latest.parquet`: Asset price data
  - `regional_data_latest.parquet`: Regional market data
  - `flow_data_latest.parquet`: Flow data between regions

### Metadata

- **last_refresh.txt**: ISO timestamp of last refresh
- **data_metadata.json**: JSON with refresh time and record counts

## Logging

Logs are written to:
- **Console**: Standard output
- **File**: `money_flow_observatory.log`

Log levels: DEBUG, INFO, WARNING, ERROR

Key log messages:
- "Scheduler started - Daily refresh scheduled for 5pm"
- "Starting daily data refresh (scheduled at 5pm)..."
- "Daily data refresh completed successfully"
- "Using persisted data (no API calls - data only refreshed at 5pm)"

## Error Handling

### API Failures

- **Alpha Vantage**: Falls back to mock data, logs warning
- **FRED**: Falls back to mock data, logs warning
- **Rate Limiting**: Detects rate limit messages, falls back to mock

### Data Availability

- **No Persisted Data**: Returns 503 error, asks to wait for 5pm refresh
- **Invalid Data**: Cleans data, removes invalid values
- **Missing Files**: Returns None, system handles gracefully

## Performance Optimizations

1. **Caching**: Responses cached for 24 hours
2. **Persistent Storage**: Fast Parquet file reads
3. **Async Operations**: Non-blocking API calls
4. **Data Cleaning**: Removes duplicates and invalid values
5. **Compression**: Parquet files are compressed (snappy)

## Security Considerations

1. **API Keys**: Stored in environment variables, not in code
2. **CORS**: Configured to allow only specified origins
3. **Error Messages**: Don't expose sensitive information
4. **Rate Limiting**: Handles API rate limits gracefully

## Future Enhancements

- WebSocket support for real-time updates
- Database integration (PostgreSQL/MongoDB)
- Authentication and authorization
- Rate limiting for API endpoints
- Monitoring and metrics (Prometheus)
- Real-time data streaming (Kafka)

## Summary

The Money Flow Observatory backend is a **well-architected FastAPI application** that:

1. **Fetches data from APIs once per day at 5pm** (via scheduler)
2. **Serves data from persistent storage** (no API calls on requests)
3. **Caches responses** for fast access
4. **Handles errors gracefully** with mock data fallback
5. **Provides two main APIs**: Global Flow and Industry Flow
6. **Uses modern Python practices**: Async/await, type hints, Pydantic models

The system is designed for **reliability, performance, and cost-effectiveness** by minimizing API calls and maximizing data reuse.

