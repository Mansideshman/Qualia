@echo off
REM Quick Start Script for JIRA Test Plan Generator (Windows)

echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║                                                                ║
echo ║   JIRA Test Plan Generator - Quick Start (Windows)            ║
echo ║                                                                ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.

REM Check Node.js installation
echo 📋 Checking prerequisites...

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed!
    echo    Please install Node.js v18+ from https://nodejs.org
    pause
    exit /b 1
)

where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm is not installed!
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i

echo ✅ Node.js: %NODE_VERSION%
echo ✅ npm: %NPM_VERSION%
echo.

REM Install dependencies
echo 📦 Installing dependencies...
if not exist "node_modules" (
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependencies already installed
)
echo.

REM Check for .env file
echo 🔐 Checking environment configuration...
if not exist ".env" (
    echo ⚠️  .env file not found
    echo.
    echo Please copy .env.template to .env:
    echo   copy .env.template .env
    echo.
    echo Then edit .env with your credentials (use Notepad):
    echo   notepad .env
    echo.
    echo Required credentials:
    echo   - REACT_APP_JIRA_BASE_URL (e.g., https://company.atlassian.net)
    echo   - REACT_APP_JIRA_EMAIL (your JIRA email)
    echo   - REACT_APP_JIRA_API_TOKEN (JIRA API token)
    echo   - REACT_APP_GROQ_API_KEY (GROQ API key)
    echo.
    echo After configuring .env, run this script again.
    echo.
    pause
    exit /b 1
) else (
    echo ✅ .env file found
)
echo.

REM Test connectivity
echo 🔗 Testing connectivity (optional)...
echo Run: node connectivity-test.js
echo.

REM Start the app
echo 🚀 Starting JIRA Test Plan Generator...
echo.
echo The app will open at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
echo ════════════════════════════════════════════════════════════════
echo.

call npm start

pause
