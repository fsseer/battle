@echo off
setlocal

cd /d "%~dp0"

rem ===== Server =====
pushd apps\server
if not exist node_modules (
	echo [server] Installing dependencies...
	npm install
)
echo [server] Starting dev server (port 5174)...
start "battle-server-dev" cmd /c "npm run dev"
popd

set SURL=http://localhost:5174/health
echo [server] Waiting for %SURL% ...
for /l %%i in (1,1,60) do (
	powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%SURL%' -Method Get -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
	if %errorlevel%==0 goto :web
	timeout /t 1 >nul
)
echo [server] Timed out waiting for server. Exiting.
goto :eof

:web
rem ===== Web =====
pushd apps\web
if not exist node_modules (
	echo [web] Installing dependencies...
	npm install
)
echo [web] Starting dev server (port 5173)...
start "battle-web-dev" cmd /c "npm run dev -- --strictPort --port 5173"
popd

set URL=http://localhost:5173
echo [web] Waiting for %URL% ...
for /l %%i in (1,1,60) do (
	powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -Method Get -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
	if %errorlevel%==0 goto :open
	timeout /t 1 >nul
)
echo [web] Timed out waiting for dev server.
goto :eof

:open
echo [open] Opening browser: %URL%
start "" %URL%

endlocal

