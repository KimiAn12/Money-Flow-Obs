# Vercel Deployment Guide

This guide explains how to deploy the Money Flow Observatory backend to Vercel with daily data refresh at 5 PM.

## Overview

The backend has been configured to work with Vercel's serverless architecture:
- **Vercel Cron Jobs** trigger data refresh at 5 PM daily
- **Upstash Redis** stores data and cache (persistent across serverless invocations)
- **No persistent processes** - scheduler is disabled on Vercel
- **Automatic fallback** - works locally with file system, on Vercel with Redis

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Upstash Redis**: Create a free account at [upstash.com](https://upstash.com)
3. **Git Repository**: Push your code to GitHub/GitLab/Bitbucket

## Step 1: Set Up Upstash Redis

1. **Create Upstash Redis Database**:
   - Go to [console.upstash.com](https://console.upstash.com)
   - Click "Create Database"
   - Choose region closest to your users
   - Select "Redis" as database type
   - Click "Create"

2. **Get Credentials**:
   - After creation, you'll see:
     - `UPSTASH_REDIS_REST_URL`: REST API URL
     - `UPSTASH_REDIS_REST_TOKEN`: REST API token
   - Save these for Step 3

## Step 2: Configure Vercel Project

1. **Import Project to Vercel**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "Add New" → "Project"
   - Import your Git repository
   - Select the `backend` directory as root (or configure build settings)

2. **Configure Build Settings**:
   - **Framework Preset**: Other
   - **Root Directory**: `backend` (if backend is in a subdirectory)
   - **Build Command**: (leave empty or `pip install -r requirements.txt`)
   - **Output Directory**: (leave empty)
   - **Install Command**: `pip install -r requirements.txt`

3. **Environment Variables**:
   Add these in Vercel project settings → Environment Variables:
   
   ```env
   # Vercel (automatically set by Vercel)
   VERCEL=1
   
   # Upstash Redis (required)
   UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your-redis-token
   
   # API Keys (required)
   ALPHA_VANTAGE_API_KEY=your-alpha-vantage-key
   FRED_API_KEY=your-fred-key
   
   # CORS (optional - adjust for your frontend URL)
   CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173
   
   # Data Settings (optional)
   DATA_DIR=data
   CACHE_TTL=86400
   USE_REAL_DATA=true
   ```

## Step 3: Verify Cron Job Configuration

The `vercel.json` file is already configured with a cron job:

```json
{
  "crons": [
    {
      "path": "/api/global-flow/refresh",
      "schedule": "0 17 * * *"
    }
  ]
}
```

This will call `/api/global-flow/refresh` every day at 5 PM UTC (17:00).

**Note**: To change the timezone, adjust the cron schedule. For example:
- `0 17 * * *` = 5 PM UTC
- `0 21 * * *` = 9 PM UTC (5 PM EST)
- `0 22 * * *` = 10 PM UTC (5 PM PST)

## Step 4: Deploy

1. **Push to Git**:
   ```bash
   git add .
   git commit -m "Configure for Vercel deployment"
   git push
   ```

2. **Deploy on Vercel**:
   - Vercel will automatically deploy on push
   - Or manually deploy from Vercel dashboard

3. **Verify Deployment**:
   - Check deployment logs in Vercel dashboard
   - Test endpoints:
     - `GET https://your-app.vercel.app/` - Root endpoint
     - `GET https://your-app.vercel.app/health` - Health check
     - `GET https://your-app.vercel.app/api/global-flow` - Global flow data
     - `POST https://your-app.vercel.app/api/global-flow/refresh` - Manual refresh

## Step 5: Test Data Refresh

1. **Manual Refresh** (for testing):
   ```bash
   curl -X POST https://your-app.vercel.app/api/global-flow/refresh
   ```

2. **Check Cron Job**:
   - Go to Vercel dashboard → Your project → Cron Jobs
   - You should see the scheduled cron job
   - Check execution logs after 5 PM UTC

3. **Verify Data Storage**:
   - Check Upstash Redis console
   - You should see keys like:
     - `data:asset_prices_latest.parquet`
     - `data:regional_data_latest.parquet`
     - `data:flow_data_latest.parquet`
     - `meta:data_metadata.json`
     - `text:last_refresh.txt`

## Step 6: Monitor and Troubleshoot

### Monitoring

1. **Vercel Logs**:
   - Go to Vercel dashboard → Your project → Logs
   - Check for errors or warnings

2. **Upstash Redis**:
   - Go to Upstash console
   - Check database metrics and usage

3. **Cron Job Execution**:
   - Vercel dashboard → Cron Jobs
   - View execution history and logs

### Troubleshooting

**Issue: Data not refreshing**
- Check cron job configuration in `vercel.json`
- Verify `/api/global-flow/refresh` endpoint is accessible
- Check Vercel logs for errors
- Ensure Upstash Redis credentials are correct

**Issue: No data available**
- Manually trigger refresh: `POST /api/global-flow/refresh`
- Check Upstash Redis for stored data
- Verify API keys are correct

**Issue: Redis connection errors**
- Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are set
- Check Upstash Redis database is active
- Ensure network allows connections to Upstash

**Issue: API rate limiting**
- Check Alpha Vantage and FRED API rate limits
- Verify API keys are valid
- Consider upgrading API plans if needed

## Architecture

```
┌─────────────────────────────────────────┐
│           Vercel Serverless             │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Vercel Cron Job (5pm daily)      │ │
│  │  → POST /api/global-flow/refresh  │ │
│  └──────────────┬────────────────────┘ │
│                 │                        │
│  ┌──────────────▼────────────────────┐ │
│  │  Refresh Endpoint                 │ │
│  │  → Fetch from APIs                │ │
│  │  → Save to Upstash Redis          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  API Endpoints                    │ │
│  │  → GET /api/global-flow           │ │
│  │  → Load from Upstash Redis        │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
                 │
                 │
┌────────────────▼────────────────────────┐
│        Upstash Redis                    │
│  - Data storage (Parquet files)         │
│  - Cache (API responses)                │
│  - Metadata (refresh times)             │
└─────────────────────────────────────────┘
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `VERCEL` | Auto | Set to "1" by Vercel automatically |
| `UPSTASH_REDIS_REST_URL` | Yes | Upstash Redis REST API URL |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis REST API token |
| `ALPHA_VANTAGE_API_KEY` | Yes | Alpha Vantage API key |
| `FRED_API_KEY` | Yes | FRED API key |
| `CORS_ORIGINS` | No | Comma-separated list of allowed origins |
| `CACHE_TTL` | No | Cache TTL in seconds (default: 86400) |
| `USE_REAL_DATA` | No | Use real API data (default: true) |

## Cost Estimation

### Vercel
- **Free Tier**: 100 GB bandwidth, 100 serverless function invocations/day
- **Pro Tier**: $20/month - Unlimited bandwidth, 1000 serverless function invocations/day

### Upstash Redis
- **Free Tier**: 10,000 commands/day, 256 MB storage
- **Pay-as-you-go**: $0.20 per 100K commands, $0.10 per GB storage

**Estimated Monthly Cost**:
- Vercel: Free (if under limits) or $20/month
- Upstash Redis: Free (if under limits) or ~$5-10/month
- **Total**: $0-30/month

## Local Development

The backend still works locally with file system storage:

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally (uses file system, not Redis)
uvicorn app.main:app --reload

# The scheduler will run automatically (5pm daily)
# Data will be saved to backend/data/ directory
```

To use Upstash Redis locally:

```bash
# Set environment variables
export UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
export UPSTASH_REDIS_REST_TOKEN=your-redis-token

# Run locally (uses Redis instead of file system)
uvicorn app.main:app --reload
```

## Next Steps

1. **Frontend Integration**: Update frontend `VITE_API_URL` to point to Vercel backend
2. **Monitoring**: Set up monitoring/alerting for cron job failures
3. **Backup**: Consider backing up Redis data periodically
4. **Scaling**: Monitor usage and upgrade plans as needed

## Support

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Upstash Docs**: [docs.upstash.com](https://docs.upstash.com)
- **FastAPI Docs**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com)

## Summary

✅ **Daily Refresh**: Vercel Cron Jobs trigger refresh at 5 PM daily  
✅ **Persistent Storage**: Upstash Redis stores data and cache  
✅ **Serverless**: No persistent processes, scales automatically  
✅ **Cost Effective**: Free tier covers most use cases  
✅ **Production Ready**: Handles errors, logging, and monitoring  

Your backend is now ready for production deployment on Vercel! 🚀

