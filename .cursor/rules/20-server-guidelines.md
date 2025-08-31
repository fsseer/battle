### 아키텍처

* 경계 분리: routes / services / utils
* 로깅/보안 유틸 통일 사용(`utils/logger`, `utils/security`, `utils/jwt`)

### 에러/보안

* 입력 검증 필수, rate-limit/보안 미들웨어 기본 적용
* 예외는 구조화하여 응답(코드/메시지), 내부 로그는 상세, 외부 메시지는 절제

### 성능

* 캐시/리소스 매니저/스마트 캐시 사용 정책 준수
* DB/IO는 비동기/배치 우선, N+1 방지


