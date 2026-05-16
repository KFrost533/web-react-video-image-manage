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

echo Checking port 5000 usage...
set "PORT_IN_USE="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /r /c:":5000 .*LISTENING"') do (
	set "PORT_IN_USE=1"
	echo Port 5000 in use by PID %%P. Killing process...
	taskkill /PID %%P /F >nul 2>nul
)

if defined PORT_IN_USE (
	echo Waiting for port release...
	timeout /t 1 /nobreak >nul
) else (
	echo Port 5000 is free.
)

echo Starting Java backend
echo Starting with Maven (latest source in backend/src/main)...
Start "ReactWebUI-Backend" cmd /k "cd /d ""%BACKEND_DIR%"" && mvn spring-boot:run -DskipTests"

echo Starting React frontend
Start "ReactWebUI-Frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm start"

echo All services started.