### 아키텍처

- 경계 분리: routes / services / utils
- 로깅/보안 유틸 통일 사용(`utils/logger`, `utils/security`, `utils/jwt`)
- 서버 부하 최소화: 클라-서버 싱크/연결 최소화, 필요 시 배치/캐시 사용
- 인게임 전투 제외 영역은 비동기 우선, 클라 사전검증으로 불필요 요청 차단
- 자원/인벤토리 동기화는 씬 전환 시 1회 수행(실패 시 백오프 재시도)

### 에러/보안

- 입력 검증 필수, rate-limit/보안 미들웨어 기본 적용
- Errors & internal messages: English only
- Error response standard: `{ code: string, message: string, details?: object, traceId?: string }`
- 내부 로그는 상세(PII 제외), 외부 메시지는 절제

### 성능

- 캐시/리소스 매니저/스마트 캐시 사용 정책 준수
- DB/IO는 비동기/배치 우선, N+1 방지
- 재시도 정책(서버 관점): 멱등 요청만 재시도 허용

### 네트워크 타임아웃/재시도(서버 권고)

- 기본 타임아웃: 1s → 재시도1: 3s → 재시도2: 5s (재시도마다 +2s)
- 최대 재시도: 3회(최초+추가 2회)
- 5xx/네트워크 오류에 한해 멱등 요청만 재시도
