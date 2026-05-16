@echo off
setlocal

set "SCRIPT_DIR=%~dp0"
for %%I in ("%SCRIPT_DIR%..") do set "ROOT=%%~fI"
set "FRONTEND_DIR=%ROOT%\frontend"
set "REQ_FILE=%ROOT%\backend\script\requirements.txt"
set "VENV_DIR=%ROOT%\.venv"
set "VENV_PY=%VENV_DIR%\Scripts\python.exe"

echo ========================================
echo Setup started
echo Root: %ROOT%
echo ========================================

where npm >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm was not found in PATH.
    exit /b 1
)

echo [1/4] Installing root npm dependencies...
cd /d "%ROOT%"
call npm install
if errorlevel 1 goto :error

echo [2/4] Installing frontend npm dependencies...
cd /d "%FRONTEND_DIR%"
call npm install
if errorlevel 1 goto :error

echo [3/4] Preparing Python virtual environment...
if not exist "%VENV_PY%" (
    if exist "%VENV_DIR%" rmdir /s /q "%VENV_DIR%"

    py -3 --version >nul 2>nul
    if not errorlevel 1 (
        py -3 -m venv "%VENV_DIR%"
    ) else (
        python --version >nul 2>nul
        if errorlevel 1 (
            echo [ERROR] Python was not found in PATH.
            exit /b 1
        )
        python -m venv "%VENV_DIR%"
    )
)

if not exist "%VENV_PY%" (
    echo [ERROR] Failed to create Python virtual environment at %VENV_DIR%.
    exit /b 1
)

echo [4/4] Installing Python packages...
"%VENV_PY%" -m pip install --upgrade pip
if errorlevel 1 goto :error

if exist "%REQ_FILE%" (
    "%VENV_PY%" -m pip install -r "%REQ_FILE%"
    if errorlevel 1 goto :error
) else (
    echo [WARN] requirements.txt not found: %REQ_FILE%
)

echo ========================================
echo Setup completed successfully.
echo Run: npm run start:all
echo ========================================
exit /b 0

:error
echo [ERROR] Setup failed.
exit /b 1
