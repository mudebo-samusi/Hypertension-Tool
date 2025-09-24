@echo off
echo Starting Hypertension Tool Webhook Server...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo Error: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if package.json exists
if not exist "webhook-package.json" (
    echo Error: webhook-package.json not found
    echo Please make sure you're running this from the correct directory
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing webhook server dependencies...
    npm install --package-file=webhook-package.json
    echo.
)

REM Start the webhook server
echo Starting webhook server on http://localhost:5174
echo.
echo Webhook endpoints:
echo - http://localhost:5174/api/webhooks/bp-reading
echo - http://localhost:5174/api/webhooks/prediction  
echo - http://localhost:5174/api/webhooks/alert
echo - http://localhost:5174/api/webhooks/status
echo.
echo Press Ctrl+C to stop the server
echo.

node webhookServer.mjs