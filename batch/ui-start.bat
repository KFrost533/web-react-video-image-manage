@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT=%%~fI"

set "BACKEND_DIR=%ROOT%\backend"
set "FRONTEND_DIR=%ROOT%\frontend"

echo Project root: %ROOT%
echo Backend directory: %BACKEND_DIR%

if not exist "%BACKEND_DIR%" (
	echo [ERROR] Backend directory not found: %BACKEND_DIR%
	exit /b 1
)

if not exist "%FRONTEND_DIR%" (
	echo [ERROR] Frontend directory not found: %FRONTEND_DIR%
	exit /b 1
)

tasklist /v | findstr /i /c:"ReactWebUI-Backend" >nul
if errorlevel 1 goto start_backend
echo Java backend terminal is already running.
goto backend_checked

:start_backend
echo Starting Java backend
echo Starting with Maven (latest source in backend/src/main)...
start "ReactWebUI-Backend" /D "%BACKEND_DIR%" cmd /k mvn spring-boot:run -DskipTests

:backend_checked

tasklist /v | findstr /i /c:"ReactWebUI-Frontend" >nul
if errorlevel 1 goto start_frontend
echo React frontend terminal is already running.
goto frontend_checked

:start_frontend
echo Starting React frontend
start "ReactWebUI-Frontend" /D "%FRONTEND_DIR%" cmd /k npm start

:frontend_checked

echo All services started.