### UI/테마

- 색 토큰: theme.css의 --bg-dark, --bronze, --blood, --parchment 우선
- 폰트: 제목 Cinzel, 본문 Inter/Noto, 제목은 대문자 스페이싱 허용
- 애니메이션: 페이지 전환 페이드 200~300ms, 과도한 모션 지양

### 레이아웃 레이어 규칙

- 배경 `.background-image`: z-index:0, pointer-events:none
- HUD `.game-header`: z-index:2000
- 하단 메뉴 `.bottom-menu-bar`: z-index:2001
- 기타 콘텐츠는 위 두 레이어보다 낮게 유지

### 레이아웃 컴포넌트

- 무언가 작업을 할 때는 기존 컴포넌트를 우선적으로 재사용 고려(필수적)
- 전반적인 컴포넌트와 레이아웃 통일성을 매우 중시해야 함
- 또한 게임 컨셉에 대한 적용 디테일에 항상 신경 쓸 것.
- `ArenaLayout` 필수 사용. 필요 시 `centerFull`/`footer` 슬롯 활용
- 사이드 패널/섹션/카드는 `ArenaPanel`/`ArenaSection`/`ArenaCard`
- 버튼은 `ArenaButton` variants 사용(primary/secondary/danger/success/ghost/gold)
- 모달은 `ArenaModal` 사용, 확인/취소/위험 액션 명확화
- 게이지류는 `StatusBar` 사용

### 스타일 가이드
- 인라인 스타일 지양. 클래스+토큰 사용, 중복 스타일은 전용 CSS
- 대비 4.5:1 이상, 상태(hover/active/disabled) 일관성
- 아이콘은 게임 세계관에 맞는 이모지/자산 사용(헬멧/월계수 등)

### 로딩/에러 UI 표준
- 공용 Skeleton: 12px radius 카드/리스트 형태, shimmer 애니메이션 1.2s linear infinite
- 공용 Spinner: 원형, 지름 28px(페이지), 20px(섹션), 14px(버튼), 회전 1s linear infinite
- 실패 다이얼로그: `ArenaModal` 사용, 제목/메시지/재시도 버튼 제공(영문 메시지)
- 네트워크 자동 재시도 후에만 재시도 버튼 1회 노출
