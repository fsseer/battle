@echo off
setlocal

rem Change to project root
cd /d "%~dp0"

rem Move to web app directory
cd apps\web

rem Ensure dependencies are installed
if not exist node_modules (
  echo [web] Installing dependencies...
  npm install
)

rem Start Vite dev server on fixed port in a new window
echo [web] Starting dev server (port 5173)...
start "battle-web-dev" cmd /c "npm run dev -- --host 127.0.0.1 --strictPort --port 5173"

rem Wait for web to be ready and open browser
set URL=http://127.0.0.1:5173
echo [web] Waiting for %URL% to be ready...

for /l %%i in (1,1,60) do (
  >nul 2>&1 curl --silent --head %URL% | findstr /i "200"
  if not errorlevel 1 goto :open
  timeout /t 1 >nul
)

echo [web] Timed out waiting for dev server. If the port is in use, close the other process and try again.
goto :eof

:open
echo [web] Opening browser: %URL%
start "" %URL%

endlocal

