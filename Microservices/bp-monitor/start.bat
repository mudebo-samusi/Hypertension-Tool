@echo off
echo.
echo ================================================
echo    BP Monitor Microservice - Windows Launcher
echo ================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Error: Python is not installed or not in PATH
    echo Please install Python 3.8 or higher
    pause
    exit /b 1
)

REM Check if we're in the correct directory
if not exist "app.py" (
    echo Error: app.py not found
    echo Please run this script from the bp-monitor directory
    pause
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Failed to create virtual environment
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/update requirements
echo Installing requirements...
pip install -r requirements.txt
if errorlevel 1 (
    echo Failed to install requirements
    pause
    exit /b 1
)

echo.
echo Starting BP Monitor Microservice...
echo Service will be available at: http://localhost:5001
echo Press Ctrl+C to stop the service
echo.

REM Start the service
python start_service.py %*

pause