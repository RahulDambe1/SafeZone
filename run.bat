@echo off
setlocal enabledelayedexpansion

:: Set console title
title SafeZone - Starting Server

:: Navigate to script directory
cd /d "%~dp0"

echo ===================================================
echo               SafeZone Launcher
echo ===================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo.
    echo Please download and install Node.js from:
    echo https://nodejs.org/
    echo.
    echo After installing, restart your command prompt or computer.
    echo.
    pause
    exit /b 1
)

:: Display Node.js version
for /f "delims=" %%v in ('node -v') do set "NODE_VERSION=%%v"
echo [OK] Node.js detected: !NODE_VERSION!

:: 2. Check if npm is installed
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] npm is not found in system PATH.
    echo Please make sure npm is installed alongside Node.js.
    echo.
    pause
    exit /b 1
)

:: Display npm version
for /f "delims=" %%v in ('npm -v') do set "NPM_VERSION=%%v"
echo [OK] npm detected:     v!NPM_VERSION!

:: 3. Check environment file
if not exist ".env.local" (
    if exist ".env.local.example" (
        echo [INFO] .env.local not found. Creating from .env.local.example...
        copy ".env.local.example" ".env.local" >nul
        echo [OK] .env.local created. Please verify your environment variables.
    ) else if exist ".env.example" (
        echo [INFO] .env.local not found. Creating from .env.example...
        copy ".env.example" ".env.local" >nul
        echo [OK] .env.local created. Please verify your environment variables.
    )
)

:: 4. Check dependencies (node_modules)
if not exist "node_modules\" (
    echo.
    echo [INFO] Dependencies not found. Installing packages with npm install...
    echo This may take a couple of minutes...
    call npm install
    if !errorlevel! neq 0 (
        echo.
        echo [ERROR] Failed to install dependencies.
        pause
        exit /b !errorlevel!
    )
    echo [OK] Dependencies installed successfully.
)

:: If run with --check-only, stop here
if "%~1"=="--check-only" (
    echo.
    echo [SUCCESS] Environment and dependency checks completed successfully.
    exit /b 0
)

echo.
echo ===================================================
echo Starting development server on http://localhost:3000
echo Press Ctrl+C to stop the server anytime.
echo ===================================================
echo.

:: 5. Launch Next.js dev server
call npm run dev

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Development server exited with code %errorlevel%.
)

echo.
pause
