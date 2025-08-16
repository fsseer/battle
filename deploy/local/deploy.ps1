param(
  [string]$SshHost = $env:SSH_HOST,
  [string]$SshUser = $env:SSH_USER,
  [string]$SshKeyPath = $env:SSH_KEY_PATH,
  [int]$SshPort = $env:SSH_PORT,
  [string]$WebRoot = $env:WEB_ROOT,
  [string]$ApiDir = $env:API_DIR,
  [string]$ViteServerOrigin = $env:VITE_SERVER_ORIGIN
)

if (-not $SshPort) { $SshPort = 22 }

if (-not $SshHost -or -not $SshUser -or -not $SshKeyPath -or -not $WebRoot -or -not $ApiDir -or -not $ViteServerOrigin) {
  Write-Error "Missing one or more params: SSH_HOST, SSH_USER, SSH_KEY_PATH, WEB_ROOT, API_DIR, VITE_SERVER_ORIGIN"
  exit 1
}

# Resolve repo/web paths relative to this script
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$WebDir   = Join-Path $RepoRoot 'apps\web'
$DistDir  = Join-Path $WebDir 'dist'

# Build web
Push-Location $WebDir
$env:VITE_SERVER_ORIGIN = $ViteServerOrigin
if (-not (Test-Path (Join-Path $WebDir 'node_modules'))) { npm install --silent | Out-Null }
npm run build | Out-Null
Pop-Location

if (-not (Test-Path (Join-Path $DistDir 'index.html'))) {
  Write-Error "Web build failed: $DistDir/index.html not found"
  exit 1
}

# Upload dist via scp (requires OpenSSH client on Windows)
$DistGlob = (Join-Path $DistDir '*')
$scpTarget = "$SshUser@$SshHost`:$WebRoot"
scp -P $SshPort -i "$SshKeyPath" -r "$DistGlob" $scpTarget
if ($LASTEXITCODE -ne 0) { Write-Error "scp failed"; exit 1 }

# Reload API via ssh + pm2
$remoteCmd = "cd '$ApiDir'; if [ ! -d node_modules ]; then npm ci; fi; pm2 reload gladiator-api || pm2 start npm --name gladiator-api -- run dev; pm2 save"
ssh -p $SshPort -i "$SshKeyPath" "$SshUser@$SshHost" "$remoteCmd"
if ($LASTEXITCODE -ne 0) { Write-Error "ssh/pm2 command failed"; exit 1 }

Write-Host "Deploy complete."
