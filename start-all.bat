@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ensure node/npx on PATH for this session
set "PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"

cd /d "%~dp0"

rem best-effort: close previously started consoles to avoid file locks/port conflicts
taskkill /f /fi "WINDOWTITLE eq battle-server-dev" >nul 2>nul
taskkill /f /fi "WINDOWTITLE eq battle-web-dev" >nul 2>nul

rem ===== Server =====
pushd apps\server
if not exist node_modules (
	echo [server] Installing dependencies...
	npm install
)
if not exist .env (
	echo DATABASE_URL=file:./prisma/dev.db> .env
) else (
	rem fix malformed DATABASE_URL lines and ensure correct value
	for /f "delims=" %%A in ('type .env ^| findstr /v /b "DATABASE_URL="') do (
		set "LINE=%%A"
		echo !LINE!>> .env.tmp
	)
	echo DATABASE_URL=file:./prisma/dev.db>> .env.tmp
	move /y .env.tmp .env >nul
)
echo [server] Applying migrations...
call npx --yes prisma migrate deploy || (echo [server][ERROR] Prisma migrate failed. Press any key to exit.& pause>nul & goto :eof)
echo [server] Generating prisma client...
rem try normal generate; on failure, remove locked engine and retry with --no-engine
call npx --yes prisma generate
if errorlevel 1 (
    powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue 'node_modules/.prisma/client/query_engine-windows.dll.node*'"
    call npx --yes prisma generate --no-engine || (echo [server][ERROR] Prisma generate failed. Press any key to exit.& pause>nul & goto :eof)
)
echo [server] Starting dev server (port 5174)...
set AP_REGEN_MS=6000
start "battle-server-dev" cmd /k "set AP_REGEN_MS=%AP_REGEN_MS% && npm run dev"
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
start "battle-web-dev" cmd /k "npm run dev -- --host 127.0.0.1 --strictPort --port 5173"
popd

set URL=http://127.0.0.1:5173
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
pause

