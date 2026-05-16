@echo off
setlocal

set "SCRIPT_DIR=%~dp0"

echo ========================================
echo Running setup:all
echo ========================================

call "%SCRIPT_DIR%ui-setup.bat"
if errorlevel 1 (
    echo [ERROR] setup:all failed.
    exit /b 1
)

echo setup:all completed.
exit /b 0
