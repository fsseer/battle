# Vindex Arena 로컬 배포 환경 설정

## 1. 환경 변수 설정

`env.example` 파일을 참고하여 환경 변수를 설정하세요:

```bash
# SSH 연결 설정
SSH_HOST=your-server-ip-or-domain
SSH_USER=ubuntu
SSH_KEY_PATH=C:\path\to\your\private_key
SSH_PORT=22

# 배포 경로 설정
WEB_ROOT=/var/www/battle-web/dist
API_DIR=/opt/gladiator/apps/server

# API 서버 URL
VITE_SERVER_ORIGIN=https://your-api-domain.com
```

## 2. SSH 연결 테스트

### PowerShell 사용

```powershell
# 환경 변수 설정 후
.\test-ssh.ps1

# 또는 직접 매개변수 전달
.\test-ssh.ps1 -SshHost 192.168.1.100 -SshUser ubuntu -SshKeyPath C:\keys\id_rsa
```

### 배치 파일 사용

```cmd
# 환경 변수 설정 후
test-ssh.bat
```

## 3. 서버 상태 확인

```powershell
# SSH 연결만 테스트
.\quick-deploy.ps1 -TestOnly

# 서버 상태까지 확인
.\quick-deploy.ps1
```

## 4. 전체 배포

```cmd
# 배치 파일 사용
deploy.bat

# PowerShell 직접 사용
deploy.ps1
```

## 5. 문제 해결

### SSH 연결 실패

- SSH 키 파일 경로 확인
- 서버 방화벽 설정 확인 (포트 22)
- SSH 서비스 상태 확인: `sudo systemctl status ssh`

### 권한 오류

- SSH 키 파일 권한 확인: `chmod 600 your_key`
- 서버 사용자 권한 확인

### 포트 연결 문제

- 기본 포트 22 사용 권장
- 다른 포트 사용 시 `SSH_PORT` 환경 변수 설정

## 6. 보안 고려사항

- SSH 키는 안전한 위치에 보관
- 공개 키만 서버에 등록
- 정기적인 키 교체 권장
- 방화벽에서 SSH 포트 제한 고려
