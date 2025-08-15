@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem ensure node/npx on PATH for this session
set "PATH=%APPDATA%\npm;%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"

cd /d "%~dp0"

rem best-effort: close previously started consoles to avoid file locks/port conflicts
echo [kill] Closing previous dev consoles (if any)...
taskkill /f /t /fi "WINDOWTITLE eq battle-server-dev" >nul 2>nul
taskkill /f /t /fi "WINDOWTITLE eq battle-web-dev" >nul 2>nul
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
	rem fix malformed DATABASE_URL lines and ensure correct value
	for /f "delims=" %%A in ('type .env ^| findstr /v /b "DATABASE_URL="') do (
		set "LINE=%%A"
		echo !LINE!>> .env.tmp
	)
	echo DATABASE_URL=file:./prisma/dev.db>> .env.tmp
	move /y .env.tmp .env >nul
)
rem ensure port 5174 is free (kill any running server) and pre-clean locked prisma engine
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
    echo [server] prisma generate failed (attempt %%i). Cleaning and retrying in %SLEEP%s...
    powershell -NoProfile -Command "Remove-Item -Force -ErrorAction SilentlyContinue 'node_modules/.prisma/client/query_engine-windows.dll.node*'"
    powershell -NoProfile -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"
    if %%i GEQ 3 (
        echo [server] Deep clean .prisma cache...
        powershell -NoProfile -Command "Remove-Item -Recurse -Force -ErrorAction SilentlyContinue 'node_modules/.prisma'"
    )
    timeout /t %SLEEP% >nul
)
echo [server][ERROR] Prisma generate failed after %RETRIES% attempts. Press any key to exit.
pause>nul & goto :eof
:gen_ok
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

