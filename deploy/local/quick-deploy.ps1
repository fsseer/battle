param(
  [string]$SshHost = $env:SSH_HOST,
  [string]$SshUser = $env:SSH_USER,
  [string]$SshKeyPath = $env:SSH_KEY_PATH,
  [int]$SshPort = $env:SSH_PORT,
  [string]$WebRoot = $env:WEB_ROOT,
  [string]$ApiDir = $env:API_DIR,
  [string]$ViteServerOrigin = $env:VITE_SERVER_ORIGIN,
  [switch]$TestOnly
)

# 기본값 설정
if (-not $SshPort) { $SshPort = 22 }

# 필수 매개변수 확인
if (-not $SshHost -or -not $SshUser -or -not $SshKeyPath) {
  Write-Error "Missing required parameters: SSH_HOST, SSH_USER, SSH_KEY_PATH"
  Write-Host "Usage: .\quick-deploy.ps1 -SshHost <host> -SshUser <user> -SshKeyPath <key_path> [-SshPort <port>] [-TestOnly]"
  exit 1
}

Write-Host "=== Vindex Arena 빠른 배포 ===" -ForegroundColor Green
Write-Host "호스트: $SshHost" -ForegroundColor Yellow
Write-Host "사용자: $SshUser" -ForegroundColor Yellow
Write-Host "포트: $SshPort" -ForegroundColor Yellow
Write-Host ""

# SSH 연결 테스트
Write-Host "1. SSH 연결 테스트 중..." -ForegroundColor Cyan
try {
  $testCmd = "echo '연결 성공'; whoami; pwd"
  $result = ssh -p $SshPort -i "$SshKeyPath" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SshUser@$SshHost" "$testCmd" 2>&1
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SSH 연결 성공!" -ForegroundColor Green
    Write-Host $result
  } else {
    Write-Host "❌ SSH 연결 실패" -ForegroundColor Red
    Write-Host $result
    exit 1
  }
} catch {
  Write-Host "❌ SSH 연결 오류: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}

if ($TestOnly) {
  Write-Host "테스트 모드로 종료합니다." -ForegroundColor Yellow
  exit 0
}

# 서버 상태 확인
Write-Host "`n2. 서버 상태 확인 중..." -ForegroundColor Cyan
try {
  $statusCmd = "pm2 list | grep gladiator-api || echo 'PM2 프로세스 없음'"
  $status = ssh -p $SshPort -i "$SshKeyPath" "$SshUser@$SshHost" "$statusCmd" 2>&1
  Write-Host "현재 PM2 상태:" -ForegroundColor Yellow
  Write-Host $status
} catch {
  Write-Host "⚠️ 서버 상태 확인 실패: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 디스크 공간 확인
Write-Host "`n3. 디스크 공간 확인 중..." -ForegroundColor Cyan
try {
  $diskCmd = "df -h / | tail -1"
  $disk = ssh -p $SshPort -i "$SshKeyPath" "$SshUser@$SshHost" "$diskCmd" 2>&1
  Write-Host "디스크 사용량:" -ForegroundColor Yellow
  Write-Host $disk
} catch {
  Write-Host "⚠️ 디스크 공간 확인 실패" -ForegroundColor Yellow
}

# 메모리 상태 확인
Write-Host "`n4. 메모리 상태 확인 중..." -ForegroundColor Cyan
try {
  $memCmd = "free -h"
  $memory = ssh -p $SshPort -i "$SshKeyPath" "$SshUser@$SshHost" "$memCmd" 2>&1
  Write-Host "메모리 상태:" -ForegroundColor Yellow
  Write-Host $memory
} catch {
  Write-Host "⚠️ 메모리 상태 확인 실패" -ForegroundColor Yellow
}

Write-Host "`n=== 서버 상태 확인 완료 ===" -ForegroundColor Green
Write-Host "이제 deploy.bat 또는 deploy.ps1을 사용하여 실제 배포를 진행할 수 있습니다." -ForegroundColor Cyan
