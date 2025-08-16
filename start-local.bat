@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem Local-only dev: fast feedback, no internet tunnel
rem - Server on 5174
rem - Web on 5173 (127.0.0.1)
rem - VITE_SERVER_ORIGIN=http://127.0.0.1:5174

set "PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
cd /d "%~dp0"

echo [kill] Closing previous dev consoles (if any)...
for %%T in (battle-server-dev battle-web-dev) do (
  taskkill /f /t /fi "WINDOWTITLE eq %%T" >nul 2>nul
)
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
echo [server] Prisma migrate deploy...
call npx --yes prisma migrate deploy || (echo [server][ERROR] migrate failed & pause>nul & goto :eof)
echo [server] Prisma generate...
call npx --yes prisma generate || echo [server][WARN] prisma generate failed, continuing
set AP_REGEN_MS=6000
echo [server] Start dev on :5174
start "battle-server-dev" cmd /k "set AP_REGEN_MS=%AP_REGEN_MS% && npm run dev"
popd

set SURL=http://localhost:5174/health
echo [server] Waiting for %SURL% ...
for /l %%i in (1,1,60) do (
  powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%SURL%' -Method Get -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
  if %errorlevel%==0 goto :web
  timeout /t 1 >nul
)
echo [server] Timed out waiting for server.
pause>nul & goto :eof

:web
rem ===== Web =====
pushd apps\web
if not exist node_modules (
  echo [web] Installing dependencies...
  npm install
)
echo [web] Start Vite dev on :5173 (127.0.0.1)
start "battle-web-dev" cmd /k "set VITE_SERVER_ORIGIN=http://127.0.0.1:5174&& npm run dev -- --host 127.0.0.1 --strictPort --port 5173"
popd

set URL=http://127.0.0.1:5173
echo [open] %URL%
start "" %URL%

endlocal
pause


