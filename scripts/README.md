# Data Update Scripts

This directory contains scripts for daily data updates.

## Overview

The `update_data.py` script:
1. Fetches data from Alpha Vantage and FRED APIs
2. Processes and transforms the data
3. Saves JSON files to `frontend/public/data/`
4. Commits and pushes changes to GitHub

## Quick Start

### 1. Install Dependencies

```bash
pip install -r scripts/requirements.txt
```

### 2. Set Environment Variables

See `ENVIRONMENT_SETUP.md` for detailed instructions.

**Quick setup**:
```bash
# Linux/macOS
export ALPHA_VANTAGE_API_KEY="your-key"
export FRED_API_KEY="your-key"

# Windows
set ALPHA_VANTAGE_API_KEY=your-key
set FRED_API_KEY=your-key
```

### 3. Test the Script

```bash
python scripts/update_data.py
```

### 4. Schedule Daily Execution

See `SCHEDULING_INSTRUCTIONS.md` for detailed instructions.

**Quick setup**:
- **Linux/macOS**: Add to crontab: `0 17 * * * cd /path/to/project && python3 scripts/update_data.py`
- **Windows**: Use Task Scheduler to run daily at 5:00 PM

## Files

- `update_data.py` - Main script for fetching and updating data
- `requirements.txt` - Python dependencies
- `SCHEDULING_INSTRUCTIONS.md` - How to schedule the script
- `ENVIRONMENT_SETUP.md` - How to set up environment variables
- `FRONTEND_INTEGRATION.md` - How to update frontend to use static files

## Output

The script creates:
- `frontend/public/data/global-flow.json` - Global market flow data
- `frontend/public/data/industry-flow.json` - Industry flow data
- `logs/update_data.log` - Script execution logs

## Features

- ✅ Fetches data from Alpha Vantage and FRED APIs
- ✅ Handles API failures with retry logic
- ✅ Generates mock data as fallback
- ✅ Saves JSON files to frontend/public/data/
- ✅ Commits and pushes to GitHub automatically
- ✅ Only commits if data has changed
- ✅ Comprehensive logging
- ✅ Error handling

## Requirements

- Python 3.10+
- pandas
- numpy
- httpx
- Git (for committing/pushing)

## Documentation

- **Scheduling**: See `SCHEDULING_INSTRUCTIONS.md`
- **Environment Setup**: See `ENVIRONMENT_SETUP.md`
- **Frontend Integration**: See `FRONTEND_INTEGRATION.md`

## Troubleshooting

### Script fails to run

- Check Python version: `python --version`
- Install dependencies: `pip install -r scripts/requirements.txt`
- Check environment variables are set
- Check logs: `logs/update_data.log`

### Git commit fails

- Verify Git is installed: `git --version`
- Check Git credentials are configured
- Verify you're in a Git repository
- Check Git remote is configured

### API calls fail

- Verify API keys are set correctly
- Check API rate limits
- Check internet connection
- Review logs for specific errors

## Support

For issues or questions:
1. Check logs: `logs/update_data.log`
2. Review documentation
3. Test script manually
4. Verify environment variables

## Summary

✅ **Daily Updates**: Script runs at 5 PM daily  
✅ **Auto-Commit**: Changes committed to GitHub automatically  
✅ **Static Files**: Frontend reads from static JSON files  
✅ **No Backend**: No server required  
✅ **Simple**: Easy to maintain and deploy  

Your data update system is ready! 🚀

