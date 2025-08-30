@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Vindex Arena - External Port Forwarding + Dynamic IP

echo ========================================
echo    Vindex Arena External Port Forwarding
echo ========================================
echo.
echo Setting up external access with fixed router forwarding
echo.

rem ===== No administrator privileges required =====
echo Running without administrator privileges.
echo.

rem ===== DDNS Configuration =====
echo [1/4] Setting up DDNS configuration...
set "DDNS_HOST=vindexarena.iptime.org"
set "HOST=%DDNS_HOST%"
echo Using DDNS host: %HOST%
echo.

rem ===== Environment Variables Setup =====
echo [2/4] Setting up environment variables...
set "ENV_FILE=%~dp0deploy\local\env.local"
set "ENV_EXAMPLE=%~dp0deploy\local\env.example"

rem Copy environment file if it doesn't exist
if not exist "!ENV_FILE!" (
    if exist "!ENV_EXAMPLE!" (
        copy "!ENV_EXAMPLE!" "!ENV_FILE!" >nul
        echo Environment file created: !ENV_FILE!
    ) else (
        echo Environment example file not found.
        echo Continuing with default values.
    )
)

rem Update env file to always use the DDNS hostname (never raw IP) - pure CMD
if exist "!ENV_FILE!" (
    call :set_kv "!ENV_FILE!" SSH_HOST "%DDNS_HOST%"
    call :set_kv "!ENV_FILE!" VITE_SERVER_ORIGIN "http://%DDNS_HOST%:5174"
    echo Environment variables updated with DDNS host.
)

rem Ensure Node/npm available on PATH
set PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%

cd /d "%~dp0"

echo [config] CLIENT HOST=%HOST% (DDNS hostname)
echo.

rem ===== Clean up existing processes =====
echo [3/4] Cleaning up existing processes...
for %%T in (battle-server-dev battle-web-dev) do (
  taskkill /f /t /fi "WINDOWTITLE eq %%T" >nul 2>nul
)

echo [3/4] Freeing ports 5174(server) and 5173(web)...
call :kill_on_port 5174
call :kill_on_port 5173

rem ===== Windows Firewall Setup (skipped: fixed router forwarding) =====
echo [skipped] Windows Firewall rule configuration is not required.

rem ===== Start Server and Web Server =====
echo [4/4] Starting server and web server...

rem Start API Server on Port 5174
pushd apps\server
if not exist node_modules (
  echo [server] Installing dependencies...
  npm install
)
if not exist .env (
  echo DATABASE_URL=file:./prisma/dev.db> .env
) else (
  findstr /b /c:"DATABASE_URL=" .env >nul || (echo DATABASE_URL=file:./prisma/dev.db>> .env)
)
rem 자동 테스트용 골드 지급 환경변수 설정
findstr /b /c:"GRANT_GOLD_ON_BOOT=" .env >nul || (echo GRANT_GOLD_ON_BOOT=true>> .env)
findstr /b /c:"GRANT_GOLD_AMOUNT=" .env >nul || (echo GRANT_GOLD_AMOUNT=1000>> .env)
echo [server] Prisma migrate deploy...
call npx --yes prisma migrate deploy || (echo [server][ERROR] migrate failed & pause>nul & goto :eof)
echo [server] Prisma generate...
call npx --yes prisma generate || echo [server][WARN] prisma generate failed, continuing
set AP_REGEN_MS=6000
set CORS_ORIGIN=http://%DDNS_HOST%:5173
set PUBLIC_HOST=%DDNS_HOST%
start "battle-server-dev" cmd /k "set AP_REGEN_MS=%AP_REGEN_MS% && set CORS_ORIGIN=%CORS_ORIGIN% && npm run dev -- --port 5174"
popd

set SURL=http://localhost:5174/health
echo [server] Waiting for server response %SURL% ...
for /l %%i in (1,1,60) do (
  set "HC="
  for /f "delims=" %%H in ('curl -s -o NUL -w "%%{http_code}" "%SURL%"') do set "HC=%%H"
  if "!HC!"=="200" goto :web_start
  timeout /t 1 >nul
)
echo [server] Server response timeout. Proceeding to start web server...
goto :web_start

:web_start
rem Start Web Server on Port 5173
pushd apps\web
if not exist node_modules (
  echo [web] Installing dependencies...
  npm install
)
set VITE_SERVER_ORIGIN=http://%DDNS_HOST%:5174
set ALLOWED_HOSTS=%DDNS_HOST%
set PUBLIC_HOST=%DDNS_HOST%
start "battle-web-dev" cmd /k "set VITE_SERVER_ORIGIN=%VITE_SERVER_ORIGIN% && set ALLOWED_HOSTS=%ALLOWED_HOSTS% && npm run dev -- --host 0.0.0.0 --strictPort --port 5173"
popd

rem ===== Update Environment Variables =====
echo Updating environment variables with DDNS host and ports...
set "ENV_FILE=%~dp0deploy\local\env.local"
if exist "!ENV_FILE!" (
    call :set_kv "!ENV_FILE!" VITE_SERVER_ORIGIN "http://%DDNS_HOST%:5174"
    call :set_kv "!ENV_FILE!" SSH_HOST "%DDNS_HOST%"
    echo Environment variables updated.
)

set URL_LOCAL=http://127.0.0.1:5173
set URL_EXT=http://%PUBLIC_HOST%:5173
echo [open] Local:   %URL_LOCAL%
echo [open] External: %URL_EXT%
start "" %URL_LOCAL%
start "" %URL_EXT%

echo.
echo ========================================
echo    Vindex Arena Server Started!
echo ========================================
echo.
echo Server started successfully on original ports!
echo DDNS Host: %DDNS_HOST%
echo Web Server: http://%DDNS_HOST%:5173 (port 5173)
echo API Server: http://%DDNS_HOST%:5174 (port 5174)
echo.
echo Router port forwarding should be:
echo External 5173 -> Internal 192.168.0.6:5173
echo External 5174 -> Internal 192.168.0.6:5174
echo.

goto :eof

:kill_on_port
set "_PORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano ^| find ":%_PORT%" ^| find "LISTENING"') do (
  if not "%%P"=="" taskkill /F /PID %%P >nul 2>nul
)
goto :eof

:set_kv
set "_FILE=%~1"
set "_KEY=%~2"
set "_VAL=%~3"
if not exist "%_FILE%" (
  >"%_FILE%" echo %_KEY%=%_VAL%
  goto :eof
)
break > "%_FILE%.tmp"
for /f "usebackq delims=" %%L in ("%_FILE%") do (
  echo %%L | findstr /b /c:"%_KEY%=" >nul
  if errorlevel 1 >>"%_FILE%.tmp" echo %%L
)
>>"%_FILE%.tmp" echo %_KEY%=%_VAL%
move /y "%_FILE%.tmp" "%_FILE%" >nul
goto :eof

endlocal
pause