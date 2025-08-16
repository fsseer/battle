@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem Usage:
rem   deploy\local\deploy.bat ^
rem     SSH_HOST=my.server.com ^
rem     SSH_USER=ubuntu ^
rem     SSH_KEY_PATH=C:\keys\id_rsa ^
rem     SSH_PORT=22 ^
rem     WEB_ROOT=/var/www/battle-web/dist ^
rem     API_DIR=/opt/gladiator/apps/server ^
rem     VITE_SERVER_ORIGIN=https://api.example.com

if "%SSH_HOST%"=="" (
  echo [ERROR] SSH_HOST env var is required.
  exit /b 1
)
if "%SSH_USER%"=="" (
  echo [ERROR] SSH_USER env var is required.
  exit /b 1
)
if "%SSH_KEY_PATH%"=="" (
  echo [ERROR] SSH_KEY_PATH env var is required.
  exit /b 1
)
if "%WEB_ROOT%"=="" (
  echo [ERROR] WEB_ROOT env var is required.
  exit /b 1
)
if "%API_DIR%"=="" (
  echo [ERROR] API_DIR env var is required.
  exit /b 1
)
if "%VITE_SERVER_ORIGIN%"=="" (
  echo [ERROR] VITE_SERVER_ORIGIN env var is required.
  exit /b 1
)
if "%SSH_PORT%"=="" ( set SSH_PORT=22 )

set PS_ARG=-NoProfile -ExecutionPolicy Bypass -File "deploy\local\deploy.ps1"
powershell %PS_ARG%
if errorlevel 1 (
  echo [ERROR] PowerShell deployment failed.
  exit /b 1
)

echo [OK] Deployment finished.
endlocal
