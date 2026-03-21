@echo off
echo Stopping ATAI Leo AI...

:: Stop Backend (Port 8000)
echo Stopping Backend (Port 8000)...
for /f "tokens=*" %%a in ('powershell -Command "Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Select-Object -Unique"') do (
    echo Killing Backend PID %%a and children...
    taskkill /F /T /PID %%a
)

:: Stop Frontend (Port 5173)
echo Stopping Frontend (Port 5173)...
for /f "tokens=*" %%a in ('powershell -Command "Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Select-Object -Unique"') do (
    echo Killing Frontend PID %%a and children...
    taskkill /F /T /PID %%a
)

echo Cleaning up any potential stray Uvicorn/Vite processes...
powershell -Command "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*uvicorn*' -or $_.CommandLine -like '*vite*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"

echo Done.
pause
