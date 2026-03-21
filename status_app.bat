@echo off
echo Checking ATAI Leo AI Status...

:: Check Backend (Port 8000)
netstat -aon | find ":8000" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [OK] Backend is running on port 8000.
) else (
    echo [X] Backend is NOT running.
)

:: Check Frontend (Port 5173)
netstat -aon | find ":5173" | find "LISTENING" >nul
if %errorlevel% equ 0 (
    echo [OK] Frontend is running on port 5173.
) else (
    echo [X] Frontend is NOT running.
)

pause
