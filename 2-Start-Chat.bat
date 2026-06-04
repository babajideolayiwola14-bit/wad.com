@echo off
title Web Chat - Running
cd /d "%~dp0"

echo.
echo ============================================
echo   STARTING WEB CHAT
echo ============================================
echo.
echo Keep this window OPEN while you use the chat.
echo To stop the app, close this window or press Ctrl+C.
echo.

if not exist "node_modules\" (
    echo Packages not installed yet.
    echo Please double-click: 1-First-Time-Setup.bat
    echo.
    pause
    exit /b 1
)

if not exist ".env" (
    echo Missing file: .env
    echo Copy .env.example to .env and add your DATABASE_URL from Render.
    pause
    exit /b 1
)

echo Opening your browser...
start "" "http://localhost:3001"

echo Starting server...
call npm run dev

pause
