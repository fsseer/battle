param(
  [string]$SshHost = $env:SSH_HOST,
  [string]$SshUser = $env:SSH_USER,
  [string]$SshKeyPath = $env:SSH_KEY_PATH,
  [int]$SshPort = $env:SSH_PORT
)

# 기본값 설정
if (-not $SshPort) { $SshPort = 22 }

# 필수 매개변수 확인
if (-not $SshHost -or -not $SshUser -or -not $SshKeyPath) {
  Write-Error "Missing required parameters: SSH_HOST, SSH_USER, SSH_KEY_PATH"
  Write-Host "Usage: .\test-ssh.ps1 -SshHost <host> -SshUser <user> -SshKeyPath <key_path> [-SshPort <port>]"
  exit 1
}

Write-Host "=== SSH 연결 테스트 ===" -ForegroundColor Green
Write-Host "호스트: $SshHost" -ForegroundColor Yellow
Write-Host "사용자: $SshUser" -ForegroundColor Yellow
Write-Host "포트: $SshPort" -ForegroundColor Yellow
Write-Host "키 경로: $SshKeyPath" -ForegroundColor Yellow
Write-Host ""

# 키 파일 존재 확인
if (-not (Test-Path $SshKeyPath)) {
  Write-Error "SSH 키 파일을 찾을 수 없습니다: $SshKeyPath"
  exit 1
}

# 키 파일 권한 확인 (Windows에서는 제한적)
Write-Host "SSH 키 파일 확인 중..." -ForegroundColor Cyan
$keyInfo = Get-ItemProperty $SshKeyPath
Write-Host "키 파일 크기: $($keyInfo.Length) bytes" -ForegroundColor Green
Write-Host ""

# SSH 연결 테스트
Write-Host "SSH 연결 테스트 중..." -ForegroundColor Cyan
try {
  $testCmd = "echo 'SSH 연결 성공!'; whoami; pwd; date"
  $result = ssh -p $SshPort -i "$SshKeyPath" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SshUser@$SshHost" "$testCmd" 2>&1
  
  if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SSH 연결 성공!" -ForegroundColor Green
    Write-Host "서버 응답:" -ForegroundColor Cyan
    Write-Host $result
  } else {
    Write-Host "❌ SSH 연결 실패 (종료 코드: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host "오류 출력:" -ForegroundColor Red
    Write-Host $result
  }
} catch {
  Write-Host "❌ SSH 연결 중 오류 발생:" -ForegroundColor Red
  Write-Host $_.Exception.Message
}

Write-Host ""
Write-Host "=== 연결 테스트 완료 ===" -ForegroundColor Green
