@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT=%%~fI"
set "FRONTEND_DIR=%ROOT%\frontend"

echo ========================================
echo Setup started
echo Root: %ROOT%
echo ========================================

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm was not found in PATH.
    exit /b 1
)

echo [1/2] Installing root npm dependencies...
cd /d "%ROOT%"
call npm install
if errorlevel 1 goto :error

echo [2/2] Installing frontend npm dependencies...
cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 goto :error

echo ========================================
echo Setup completed successfully.
echo Run: npm run start:all
echo ========================================
exit /b 0

:error
echo [ERROR] Setup failed.
exit /b 1
