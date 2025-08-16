@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem External access launcher using LocalTunnel (lt)
rem - Exposes web(5173) and api(5174) to internet with fixed subdomains
rem - Sets VITE_SERVER_ORIGIN for web and CORS_ORIGIN for server automatically

rem Ensure Node/npm available on PATH
set "PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"

cd /d "%~dp0"

rem ===== Configurable: choose your subdomains (must be globally unique) =====
set WEB_SUBDOMAIN=gladiator-web
set API_SUBDOMAIN=gladiator-api
set WEB_URL=https://%WEB_SUBDOMAIN%.loca.lt
set API_URL=https://%API_SUBDOMAIN%.loca.lt

echo [config] WEB_URL=%WEB_URL%
echo [config] API_URL=%API_URL%

rem ===== Cleanup old consoles/processes/ports =====
echo [kill] Closing previous dev/tunnel consoles (if any)...
taskkill /f /t /fi "WINDOWTITLE eq battle-server-dev" >nul 2>nul
taskkill /f /t /fi "WINDOWTITLE eq battle-web-dev" >nul 2>nul
taskkill /f /t /fi "WINDOWTITLE eq battle-tunnel-web" >nul 2>nul
taskkill /f /t /fi "WINDOWTITLE eq battle-tunnel-api" >nul 2>nul

echo [kill] Freeing ports 5174(server) and 5173(web) (if any)...
powershell -NoProfile -Command "try { Get-Process -Id (Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue } catch { }"
powershell -NoProfile -Command "try { Get-Process -Id (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue } catch { }"

rem ===== Server =====
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

echo [server] Freeing port 5174 and cleaning prisma engine (if any)...
powershell -NoProfile -Command "try { Get-Process -Id (Get-NetTCPConnection -LocalPort 5174 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique) -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue } catch { }"
powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue 'node_modules/.prisma/client/query_engine-windows.dll.node*'"

echo [server] Applying migrations...
call npx --yes prisma migrate deploy || (echo [server][ERROR] Prisma migrate failed. Press any key to exit.& pause>nul & goto :eof)

echo [server] Generating prisma client...
set RETRIES=5
set SLEEP=2
for /l %%i in (1,1,%RETRIES%) do (
    call npx --yes prisma generate && goto :gen_ok
    echo [server] prisma generate failed attempt %%i - cleaning and retrying in %SLEEP%s...
    powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue 'node_modules/.prisma/client/query_engine-windows.dll.node*'"
    powershell -NoProfile -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"
    if %%i GEQ 3 (
        echo [server] Deep clean .prisma cache...
        powershell -NoProfile -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue 'node_modules/.prisma'"
    )
    timeout /t %SLEEP% >nul
)
echo [server][ERROR] Prisma generate failed after %RETRIES% attempts.
echo Press any key to exit...
pause>nul & goto :eof
:gen_ok

echo [server] Starting dev server (port 5174, CORS to %WEB_URL%)...
set AP_REGEN_MS=6000
start "battle-server-dev" cmd /k "set AP_REGEN_MS=%AP_REGEN_MS% && set CORS_ORIGIN=%WEB_URL% && npm run dev"
popd

set SURL=http://localhost:5174/health
echo [server] Waiting for %SURL% ...
for /l %%i in (1,1,60) do (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%SURL%' -Method Get -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
    if %errorlevel%==0 goto :tunnels
    timeout /t 1 >nul
)
echo [server] Timed out waiting for server.
echo Press any key to exit...
pause>nul
goto :eof

:tunnels
rem ===== Tunnels (LocalTunnel) =====
echo [tunnel] Starting API tunnel => %API_URL%
start "battle-tunnel-api" cmd /k "npx --yes localtunnel --port 5174 --subdomain %API_SUBDOMAIN%"

rem Small delay to reduce collision
timeout /t 2 >nul

echo [tunnel] Starting WEB tunnel => %WEB_URL%
start "battle-tunnel-web" cmd /k "npx --yes localtunnel --port 5173 --subdomain %WEB_SUBDOMAIN%"

rem ===== Web =====
pushd apps\web
if not exist node_modules (
    echo [web] Installing dependencies...
    npm install
)
echo [web] Starting dev server (port 5173, bind 0.0.0.0, VITE_SERVER_ORIGIN=%API_URL%)...
start "battle-web-dev" cmd /k "set VITE_SERVER_ORIGIN=%API_URL% && npm run dev -- --host 0.0.0.0 --strictPort --port 5173"
popd

set URL=http://127.0.0.1:5173
echo [web] Waiting for %URL% ...
for /l %%i in (1,1,60) do (
    powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -Method Get -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
    if %errorlevel%==0 goto :open
    timeout /t 1 >nul
)
echo [web] Timed out waiting for dev server.
echo Press any key to exit...
pause>nul
goto :eof

:open
echo [open] Local:   %URL%
echo [open] External: %WEB_URL%
start "" %URL%
start "" %WEB_URL%

endlocal
pause


