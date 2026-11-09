@echo off
setlocal
cd /d "%~dp0"

where python >nul 2>nul
if not errorlevel 1 goto use_python

where py >nul 2>nul
if not errorlevel 1 goto use_py

echo.
echo Python not found. Please install Python 3, then run this file again.
echo Or use any static web server from this folder.
echo.
pause
exit /b 1

:use_python
set "PY=python"
goto start

:use_py
set "PY=py"

:start
start "Nimnim Planet - Local Server" cmd /k "%PY% -m http.server 8080 --bind 127.0.0.1"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8080/"
endlocal
