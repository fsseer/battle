@echo off
setlocal EnableExtensions EnableDelayedExpansion

echo === SSH 연결 테스트 ===
echo.

rem 환경 변수 확인
if "%SSH_HOST%"=="" (
  echo [ERROR] SSH_HOST 환경 변수가 설정되지 않았습니다.
  echo deploy\local\env.example 파일을 참고하여 환경 변수를 설정하세요.
  exit /b 1
)

if "%SSH_USER%"=="" (
  echo [ERROR] SSH_USER 환경 변수가 설정되지 않았습니다.
  exit /b 1
)

if "%SSH_KEY_PATH%"=="" (
  echo [ERROR] SSH_KEY_PATH 환경 변수가 설정되지 않았습니다.
  exit /b 1
)

if "%SSH_PORT%"=="" (
  set SSH_PORT=22
  echo [INFO] SSH_PORT가 설정되지 않아 기본값 22를 사용합니다.
)

echo [INFO] 연결 정보:
echo   호스트: %SSH_HOST%
echo   사용자: %SSH_USER%
echo   포트: %SSH_PORT%
echo   키 경로: %SSH_KEY_PATH%
echo.

rem 키 파일 존재 확인
if not exist "%SSH_KEY_PATH%" (
  echo [ERROR] SSH 키 파일을 찾을 수 없습니다: %SSH_KEY_PATH%
  exit /b 1
)

echo [INFO] SSH 키 파일 확인 완료
echo.

rem PowerShell 스크립트 실행
set PS_ARG=-NoProfile -ExecutionPolicy Bypass -File "deploy\local\test-ssh.ps1"
powershell %PS_ARG%

if errorlevel 1 (
  echo.
  echo [ERROR] SSH 테스트 실패
  exit /b 1
)

echo.
echo [OK] SSH 테스트 완료
endlocal
