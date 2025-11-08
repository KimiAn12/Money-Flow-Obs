#!/bin/bash
# Startup script for Money Flow Observatory Backend

echo "Starting Money Flow Observatory Backend..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Install dependencies if needed
if [ ! -d "venv" ] || [ ! -f "venv/bin/activate" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
fi

# Create data directory
mkdir -p data

# Run the application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

