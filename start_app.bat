@echo off
echo Starting ATAI Leo AI...

:: Start Backend
echo Starting Backend...
start "Leo Backend" /D "backend" cmd /k "venv\Scripts\activate && uvicorn main:app --reload"

:: Start Frontend
echo Starting Frontend...
start "Leo Frontend" /D "frontend" cmd /k "npm run dev"

echo Both services launched!
timeout /t 3
