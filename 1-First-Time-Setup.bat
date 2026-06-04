@echo off
title Web Chat - First Time Setup
cd /d "%~dp0"

echo.
echo ============================================
echo   WEB CHAT - FIRST TIME SETUP
echo ============================================
echo.

where node >nul 2>&1
if errorlevel 1 (
    echo Node.js is not installed.
    echo Please install it from https://nodejs.org
    echo Choose the LTS version, then run this file again.
    pause
    exit /b 1
)

echo Step 1: Downloading app packages...
echo This may take a few minutes. Please wait.
echo.
call npm install
if errorlevel 1 (
    echo.
    echo Something went wrong during setup.
    pause
    exit /b 1
)

echo.
echo ============================================
echo   SETUP FINISHED
echo ============================================
echo.
echo IMPORTANT - one more thing YOU must do:
echo.
echo 1. Open the file named ".env" in this folder
echo 2. Paste your Render database link after DATABASE_URL=
echo    (from Render website: Database - Connect - copy URL)
echo 3. Save the file
echo.
echo After that, double-click: 2-Start-Chat.bat
echo.
pause
