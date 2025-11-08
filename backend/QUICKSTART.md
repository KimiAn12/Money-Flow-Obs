# Quick Start Guide

## Installation

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment:**
   - Windows: `venv\Scripts\activate`
   - Linux/Mac: `source venv/bin/activate`

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

5. **Run the server:**
   ```bash
   python run.py
   ```
   
   Or use uvicorn directly:
   ```bash
   uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
   ```

## API Endpoints

Once running, the API will be available at `http://localhost:8001`

- **API Documentation:** http://localhost:8001/docs
- **Industry Flow:** http://localhost:8001/api/industry-flow
- **Global Flow:** http://localhost:8001/api/global-flow
- **Health Check:** http://localhost:8001/health

## Testing the API

### Using curl:

```bash
# Industry Flow
curl http://localhost:8001/api/industry-flow

# Global Flow
curl http://localhost:8001/api/global-flow

# With query parameters
curl "http://localhost:8001/api/industry-flow?timeRange=1M&refresh=true"
```

### Using Python:

```python
import requests

# Industry Flow
response = requests.get("http://localhost:8001/api/industry-flow")
data = response.json()
print(data)

# Global Flow
response = requests.get("http://localhost:8001/api/global-flow")
data = response.json()
print(data)
```

## Connecting Frontend

Update your frontend API calls to point to the backend:

```typescript
// Instead of: import industryFlowData from './data/industry-flow.json'
const response = await fetch('http://localhost:8001/api/industry-flow');
const industryFlowData = await response.json();
```

## Features

- ✅ Mock data generation (ready for real API integration)
- ✅ Automatic data refresh every 5 minutes
- ✅ Response caching (5-minute TTL)
- ✅ Data persistence to Parquet files
- ✅ Comprehensive logging
- ✅ Error handling
- ✅ CORS enabled for frontend

## Next Steps

1. **Integrate Real Data Sources:**
   - Modify `app/core/data_pipeline.py` to fetch from real APIs
   - Add API keys to `.env` file
   - Update data processing logic

2. **Enable Redis Caching (Optional):**
   ```bash
   # Install Redis
   # Then set environment variable:
   export USE_REDIS=true
   export REDIS_URL=redis://localhost:6379/0
   ```

3. **Deploy to Production:**
   - Use Docker (see README.md)
   - Set up environment variables
   - Configure reverse proxy (nginx)
   - Enable HTTPS

## Troubleshooting

**Port already in use:**
```bash
# Change port in run.py or use:
uvicorn app.main:app --port 8001
```

**Import errors:**
```bash
# Make sure you're in the backend directory and venv is activated
pip install -r requirements.txt
```

**Data directory issues:**
```bash
# Create data directory manually
mkdir data
```

