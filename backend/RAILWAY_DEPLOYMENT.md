# Railway Deployment Guide

This guide explains how to deploy the Money Flow Observatory backend to Railway.

## Overview

- **Backend**: Deployed on Railway (FastAPI with persistent storage)
- **Frontend**: Deployed on Vercel (React app)
- **Scheduler**: APScheduler runs daily at 5 PM (Railway supports persistent processes)
- **Storage**: File system (Railway has persistent storage)
- **Cache**: In-memory or Redis (optional)

## Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Git Repository**: Push your code to GitHub/GitLab/Bitbucket
3. **API Keys**: Alpha Vantage and FRED API keys

## Step 1: Prepare Backend for Railway

The backend is already configured for Railway:
- ✅ `railway.json` - Railway configuration
- ✅ `Procfile` - Process file for Railway
- ✅ `runtime.txt` - Python version specification
- ✅ APScheduler enabled (runs daily at 5 PM)
- ✅ File system storage (persistent on Railway)

## Step 2: Deploy Backend to Railway

### 2.1 Create Railway Project

1. Go to [railway.app](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo" (or your Git provider)
4. Select your repository
5. Select the `backend` directory as the root

### 2.2 Configure Build Settings

Railway will automatically detect:
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Python Version**: Python 3.12 (from `runtime.txt`)

### 2.3 Set Environment Variables

In Railway dashboard → Your Project → Variables, add:

```env
# API Keys (REQUIRED)
ALPHA_VANTAGE_API_KEY=your-alpha-vantage-api-key
FRED_API_KEY=your-fred-api-key

# CORS Origins (REQUIRED - include your Vercel frontend URL)
CORS_ORIGINS=https://your-frontend.vercel.app,http://localhost:5173

# Data Settings (optional)
DATA_DIR=data
CACHE_TTL=86400
USE_REAL_DATA=true

# Redis (optional - for caching only)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Logging (optional)
LOG_LEVEL=INFO
```

### 2.4 Deploy

1. Railway will automatically deploy on push
2. Or click "Deploy" in Railway dashboard
3. Wait for deployment to complete
4. Note your Railway URL (e.g., `https://your-app.up.railway.app`)

## Step 3: Update Frontend Configuration

### 3.1 Update Frontend Environment Variables

In your frontend `.env` file (or Vercel environment variables):

```env
VITE_API_URL=https://your-backend.up.railway.app
```

### 3.2 Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Import your Git repository
3. Set root directory to `frontend`
4. Add environment variable:
   - `VITE_API_URL=https://your-backend.up.railway.app`
5. Deploy

## Step 4: Verify Deployment

### 4.1 Test Backend Endpoints

```bash
# Root endpoint
curl https://your-backend.up.railway.app/

# Health check
curl https://your-backend.up.railway.app/health

# Global flow data
curl https://your-backend.up.railway.app/api/global-flow

# Manual refresh (optional)
curl -X POST https://your-backend.up.railway.app/api/global-flow/refresh
```

### 4.2 Test Frontend

1. Visit your Vercel frontend URL
2. Verify it connects to Railway backend
3. Test data loading
4. Check browser console for errors

## Step 5: Monitor Deployment

### 5.1 Railway Logs

- Go to Railway dashboard → Your Project → Deployments
- Click on latest deployment
- View logs for startup messages and errors

### 5.2 Verify Scheduler

- Check logs for: "Scheduler started - Daily refresh scheduled for 5pm"
- Wait for 5 PM UTC and verify data refresh occurs
- Check logs for: "Daily data refresh completed successfully"

### 5.3 Verify Data Storage

- Check Railway logs for: "Using local file system for data persistence"
- Data files are stored in `data/` directory on Railway
- Files persist across deployments

## Architecture

```
┌─────────────────────────────────────────┐
│         Vercel (Frontend)               │
│  - React App                            │
│  - VITE_API_URL → Railway Backend       │
└─────────────────┬───────────────────────┘
                  │
                  │ HTTP Requests
                  │
┌─────────────────▼───────────────────────┐
│        Railway (Backend)                │
│  - FastAPI App                          │
│  - APScheduler (5 PM daily)             │
│  - File System Storage                  │
│  - Persistent Process                   │
└─────────────────────────────────────────┘
```

## Environment Variables Reference

### Backend (Railway)

| Variable | Required | Description |
|----------|----------|-------------|
| `ALPHA_VANTAGE_API_KEY` | Yes | Alpha Vantage API key |
| `FRED_API_KEY` | Yes | FRED API key |
| `CORS_ORIGINS` | Yes | Comma-separated list of allowed origins (include Vercel frontend URL) |
| `DATA_DIR` | No | Data directory (default: `data`) |
| `CACHE_TTL` | No | Cache TTL in seconds (default: 86400) |
| `USE_REAL_DATA` | No | Use real API data (default: true) |
| `UPSTASH_REDIS_REST_URL` | No | Redis URL (optional, for caching) |
| `UPSTASH_REDIS_REST_TOKEN` | No | Redis token (optional, for caching) |
| `LOG_LEVEL` | No | Log level (default: INFO) |

### Frontend (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes | Railway backend URL |

## Troubleshooting

### Issue: Backend Fails to Start
**Solution**: 
- Check Railway logs for errors
- Verify all environment variables are set
- Check Python version matches `runtime.txt`

### Issue: CORS Errors
**Solution**:
- Verify `CORS_ORIGINS` includes your Vercel frontend URL
- Check frontend is using correct `VITE_API_URL`
- Verify CORS middleware is configured correctly

### Issue: Scheduler Not Running
**Solution**:
- Check Railway logs for scheduler startup messages
- Verify APScheduler is installed
- Check timezone settings (scheduler runs at 5 PM UTC)

### Issue: Data Not Persisting
**Solution**:
- Verify Railway has persistent storage enabled
- Check `DATA_DIR` environment variable
- Verify file system permissions

### Issue: Frontend Can't Connect to Backend
**Solution**:
- Verify `VITE_API_URL` is set correctly
- Check Railway backend URL is accessible
- Verify CORS is configured correctly
- Check browser console for errors

## Cost Estimation

### Railway
- **Free Tier**: $5 credit/month
- **Hobby Plan**: $5/month - 512 MB RAM, 1 GB storage
- **Pro Plan**: $20/month - 8 GB RAM, 100 GB storage

### Vercel
- **Free Tier**: 100 GB bandwidth, unlimited deployments
- **Pro Tier**: $20/month - Unlimited bandwidth

**Estimated Monthly Cost**: $0-25/month (depending on usage)

## Benefits of Railway Deployment

1. ✅ **Persistent Storage**: File system storage (no need for Redis)
2. ✅ **Persistent Processes**: Scheduler runs continuously
3. ✅ **No Size Limits**: Can use pandas, numpy, pyarrow without issues
4. ✅ **Easy Deployment**: Git-based deployment
5. ✅ **Automatic Scaling**: Scales based on traffic
6. ✅ **Cost Effective**: Free tier available

## Next Steps

1. Deploy backend to Railway
2. Update frontend environment variables
3. Deploy frontend to Vercel
4. Test endpoints
5. Monitor logs
6. Verify scheduler execution

## Support

- **Railway Docs**: [docs.railway.app](https://docs.railway.app)
- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **FastAPI Docs**: [fastapi.tiangolo.com](https://fastapi.tiangolo.com)

## Summary

✅ **Backend**: Railway (FastAPI with persistent storage and scheduler)  
✅ **Frontend**: Vercel (React app)  
✅ **Scheduler**: APScheduler runs daily at 5 PM UTC  
✅ **Storage**: File system (persistent on Railway)  
✅ **Cache**: In-memory (or Redis optional)  

Your backend is now ready for Railway deployment! 🚀

