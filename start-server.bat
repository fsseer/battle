@echo off
setlocal

cd /d "%~dp0"

echo [server] moving into apps\server
pushd apps\server

if not exist node_modules (
  echo [server] installing dependencies...
  npm install
)

if not exist .env (
  echo DATABASE_URL=file:./prisma/dev.db> .env
) else (
  findstr /b /c:"DATABASE_URL=" .env >nul || (echo DATABASE_URL=file:./prisma/dev.db>> .env)
)

echo [server] applying migrations (silent)...
npx --yes prisma migrate deploy >nul 2>&1
echo [server] generating prisma client (silent)...
npx --yes prisma generate >nul 2>&1

echo [server] starting dev server on port 5174 (window will remain open)
start "battle-server-dev" cmd /k "npm run dev"

popd
endlocal

