# Money Flow Observatory Backend

Production-grade FastAPI backend for the Money Flow Observatory project. This backend acts as a real-time data engine that collects, processes, and serves correlation and money flow metrics across global financial markets.

## Features

- **Industry Flow API**: Exposes correlation and flow intensity data between Stocks, Bonds, Commodities, Crypto, and Cash
- **Global Market Flow API**: Returns aggregated inflows/outflows between regions (USA, China, India, Japan, Europe)
- **Data Pipeline**: Fetches and processes market data with mock data generators (ready for real API integration)
- **Metrics Computation**: Calculates correlation matrices, flow intensity, volatility-weighted scores
- **Caching**: In-memory caching with optional Redis support
- **Data Persistence**: Saves data to Parquet/CSV files
- **Scheduled Refresh**: Automatic data refresh every 5 minutes using APScheduler
- **Real-time Ready**: Structured for future integration with streaming data sources

## Architecture

```
backend/
├── app/
│   ├── api/
│   │   ├── industry_flow.py    # Industry Flow API endpoints
│   │   └── global_flow.py      # Global Market Flow API endpoints
│   ├── core/
│   │   ├── data_pipeline.py    # Data fetching and processing
│   │   ├── metrics.py          # Correlation and flow calculations
│   │   ├── cache.py            # Caching layer
│   │   └── persistence.py      # Data persistence
│   ├── models/
│   │   └── schemas.py          # Pydantic models
│   ├── config.py               # Configuration settings
│   └── main.py                 # FastAPI application
├── data/                       # Data storage directory
├── requirements.txt
└── README.md
```

## Installation

### Prerequisites

- Python 3.10 or higher
- pip or poetry

### Setup

1. **Create a virtual environment** (recommended):

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies**:

```bash
pip install -r requirements.txt
```

3. **Create data directory**:

```bash
mkdir -p data
```

4. **Optional: Setup Redis** (for distributed caching):

```bash
# Install Redis (varies by OS)
# Then set environment variable:
export USE_REDIS=true
export REDIS_URL=redis://localhost:6379/0
```

## Running the Application

### Development Mode

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

The API will be available at:
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Industry Flow API

**GET** `/api/industry-flow`

Returns correlation and flow intensity data between asset classes.

Query Parameters:
- `timeRange` (optional): Time range for data (`1D`, `1W`, `1M`, `3M`, `1Y`) - default: `1W`
- `refresh` (optional): Force refresh of cached data (boolean) - default: `false`

Response:
```json
{
  "timestamp": "2025-11-07T14:30:00Z",
  "nodes": [
    {
      "id": "stocks",
      "name": "Stocks",
      "marketCap": 95000000000000,
      "priceChange": 1.2,
      "correlation": 1.0,
      "volatility": 0.15
    }
  ],
  "edges": [
    {
      "source": "stocks",
      "target": "bonds",
      "strength": 0.8,
      "correlation": -0.42,
      "netFlow": 2.3,
      "flowScore": 0.65
    }
  ],
  "insights": [
    "Commodities outflows increased 7% vs last week",
    "Crypto shows strongest inverse correlation with Bonds (-0.58)"
  ]
}
```

### Global Market Flow API

**GET** `/api/global-flow`

Returns aggregated inflows/outflows between regions.

Query Parameters:
- `timeRange` (optional): Time range for data (`1D`, `1W`, `1M`, `3M`, `1Y`) - default: `1W`
- `refresh` (optional): Force refresh of cached data (boolean) - default: `false`

Response:
```json
{
  "timestamp": "2025-11-07T14:30:00Z",
  "regions": [
    {
      "id": "usa",
      "name": "USA",
      "stockIndex": 5247.89,
      "stockChange": 0.85,
      "currency": "USD",
      "currencyStrength": 1.0,
      "bondYield": 4.32
    }
  ],
  "flows": [
    {
      "source": "usa",
      "target": "china",
      "amount": 12500000000,
      "assetType": "equities",
      "netFlowPercent": 2.3
    }
  ]
}
```

### Health Check

**GET** `/health`

Returns API health status.

## Configuration

Configuration can be set via environment variables or a `.env` file:

```env
# CORS Origins (comma-separated)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000

# Data Settings
DATA_DIR=data
CACHE_TTL=300
DATA_REFRESH_INTERVAL=5

# Redis (optional)
USE_REDIS=false
REDIS_URL=redis://localhost:6379/0

# Logging
LOG_LEVEL=INFO
LOG_FILE=money_flow_observatory.log
```

## Data Pipeline

The data pipeline currently uses mock data generators but is structured for easy integration with real data sources:

### Future Integration Points

1. **Alpha Vantage API**: For stock market data
2. **Yahoo Finance API**: For historical price data
3. **FRED API**: For economic indicators and bond yields
4. **Binance API**: For cryptocurrency data
5. **FX APIs**: For currency exchange rates

### Adding Real Data Sources

To integrate a real data source, modify `app/core/data_pipeline.py`:

```python
def fetch_asset_prices(self, days: int = 30) -> pd.DataFrame:
    # Replace mock data generation with API calls
    # Example:
    # response = httpx.get(f"https://api.alphavantage.co/...")
    # data = process_response(response)
    # return pd.DataFrame(data)
```

## Metrics Computation

The metrics module (`app/core/metrics.py`) computes:

- **Correlation Matrix**: Pearson correlation between assets
- **Rolling Correlation**: Time-windowed correlation
- **Flow Intensity**: Normalized change in market capitalization
- **Volatility**: Standard deviation of returns
- **Volatility-Weighted Flow Score**: Combined metric showing capital movement activity

## Caching

The application uses in-memory caching by default with a 5-minute TTL. For production deployments, Redis can be enabled:

```bash
export USE_REDIS=true
export REDIS_URL=redis://localhost:6379/0
```

## Data Persistence

Data is automatically saved to Parquet files in the `data/` directory:

- `asset_prices_*.parquet`: Historical asset price data
- `regional_data_*.parquet`: Regional market data
- `flow_data_*.parquet`: Flow data between regions

## Scheduled Tasks

The application uses APScheduler to automatically:

- **Refresh Data**: Every 5 minutes
- **Cleanup Cache**: Every hour

## Development

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black app/
```

### Type Checking

```bash
mypy app/
```

## Production Deployment

### Docker (Recommended)

Create a `Dockerfile`:

```dockerfile
FROM python:3.10-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:

```bash
docker build -t money-flow-backend .
docker run -p 8000:8000 money-flow-backend
```

### Environment Variables

Set production environment variables:

```bash
export LOG_LEVEL=INFO
export CACHE_TTL=300
export DATA_REFRESH_INTERVAL=5
export USE_REDIS=true
export REDIS_URL=redis://redis-server:6379/0
```

## Logging

Logs are written to both console and file (`money_flow_observatory.log`). Log levels can be configured via the `LOG_LEVEL` environment variable.

## Error Handling

The application includes comprehensive error handling:

- API endpoints return appropriate HTTP status codes
- Errors are logged with full stack traces
- Graceful degradation when external services are unavailable

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Kafka integration for streaming data
- [ ] Database integration (PostgreSQL/MongoDB)
- [ ] Authentication and authorization
- [ ] Rate limiting
- [ ] Monitoring and metrics (Prometheus)
- [ ] Real-time data source integration

## License

This project is part of the Money Flow Observatory application.

