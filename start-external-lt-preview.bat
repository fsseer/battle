@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem External access (preview) using LocalTunnel
rem - Build web (inject VITE_SERVER_ORIGIN)
rem - Start API dev server
rem - Expose both via LocalTunnel

set "PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
cd /d "%~dp0"

set WEB_SUBDOMAIN=gladiator-web
set API_SUBDOMAIN=gladiator-api
set WEB_URL=https://%WEB_SUBDOMAIN%.loca.lt
set API_URL=https://%API_SUBDOMAIN%.loca.lt

echo [config] WEB_URL=%WEB_URL%
echo [config] API_URL=%API_URL%

echo [kill] Closing previous consoles/tunnels...
for %%T in (battle-server-dev battle-web-dev battle-tunnel-web battle-tunnel-api) do (
  taskkill /f /t /fi "WINDOWTITLE eq %%T" >nul 2>nul
)
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
echo [server] Migrate...
call npx --yes prisma migrate deploy || (echo [server][ERROR] migrate failed & pause>nul & goto :eof)
echo [server] Generate client...
call npx --yes prisma generate || (echo [server][WARN] prisma generate failed, continuing)
echo [server] Start dev (CORS to %WEB_URL%)
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
echo [server] Timed out.
pause>nul
goto :eof

:tunnels
echo [tunnel] API => %API_URL%
start "battle-tunnel-api" cmd /k "npx --yes localtunnel --port 5174 --subdomain %API_SUBDOMAIN%"
timeout /t 2 >nul
echo [tunnel] WEB => %WEB_URL%
start "battle-tunnel-web" cmd /k "npx --yes localtunnel --port 5173 --subdomain %WEB_SUBDOMAIN%"

rem ===== Web (build + preview) =====
pushd apps\web
if not exist node_modules (
  echo [web] Installing dependencies...
  npm install
)
echo [web] Build with VITE_SERVER_ORIGIN=%API_URL%
cmd /c "set VITE_SERVER_ORIGIN=%API_URL%&& npm run build"
echo [web] Preview on 0.0.0.0:5173
start "battle-web-dev" cmd /k "set VITE_SERVER_ORIGIN=%API_URL%&& npm run preview -- --host 0.0.0.0 --port 5173"
popd

set URL=http://127.0.0.1:5173
echo [open] Local:   %URL%
echo [open] External: %WEB_URL%
start "" %URL%
start "" %WEB_URL%

endlocal
pause


