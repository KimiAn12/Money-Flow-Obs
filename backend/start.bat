@echo off
REM Startup script for Money Flow Observatory Backend (Windows)

echo Starting Money Flow Observatory Backend...

REM Activate virtual environment if it exists
if exist venv\Scripts\activate.bat (
    call venv\Scripts\activate.bat
) else (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -r requirements.txt
)

REM Create data directory
if not exist data mkdir data

REM Run the application
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

pause

