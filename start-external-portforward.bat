@echo off
setlocal

rem External access via port-forwarding (router)
rem - Uses your DDNS host for origins
rem - Binds web/api on 0.0.0.0:5173/5174
rem - Opens Windows Firewall ports (best-effort)

rem ===== Configure your DDNS host here =====
set HOST=vindexarena.iptime.org

rem Ensure Node/npm available on PATH
set PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%

cd /d "%~dp0"

echo [config] HOST=%HOST%

echo [kill] Closing previous consoles...
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
set CORS_ORIGIN=http://%HOST%:5173
echo [server] Start dev on :5174 (CORS_ORIGIN=%CORS_ORIGIN%)
start "battle-server-dev" cmd /k "set AP_REGEN_MS=%AP_REGEN_MS% && set CORS_ORIGIN=%CORS_ORIGIN% && npm run dev"
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
rem ===== Windows Firewall (best-effort) =====
echo [fw] Opening TCP 5173, 5174 (if needed)...
netsh advfirewall firewall add rule name="battle-web-5173" dir=in action=allow protocol=TCP localport=5173 >nul 2>nul
netsh advfirewall firewall add rule name="battle-api-5174" dir=in action=allow protocol=TCP localport=5174 >nul 2>nul

rem ===== Web =====
pushd apps\web
if not exist node_modules (
  echo [web] Installing dependencies...
  npm install
)
set VITE_SERVER_ORIGIN=http://%HOST%:5174
set ALLOWED_HOSTS=%HOST%
echo [web] Start Vite dev on :5173 (0.0.0.0) with VITE_SERVER_ORIGIN=%VITE_SERVER_ORIGIN%
start "battle-web-dev" cmd /k "set VITE_SERVER_ORIGIN=%VITE_SERVER_ORIGIN% && set ALLOWED_HOSTS=%ALLOWED_HOSTS% && npm run dev -- --host 0.0.0.0 --strictPort --port 5173"
popd

set URL_LOCAL=http://127.0.0.1:5173
set URL_EXT=http://%HOST%:5173
echo [open] Local:   %URL_LOCAL%
echo [open] External: %URL_EXT%
start "" %URL_LOCAL%
start "" %URL_EXT%

endlocal
pause