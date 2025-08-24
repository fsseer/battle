# 🎮 Vindex Arena - 가로형 레이아웃 시스템

## 📱 개요

Vindex Arena는 가로형 디스플레이와 720p 이상 해상도에 최적화된 게임입니다. 새로운 가로형 레이아웃 컴포넌트 시스템을 통해 일관된 UI/UX를 제공합니다.

## 🎯 주요 특징

- **가로형 전용**: 세로형 디스플레이 지원 중단
- **720p+ 해상도**: 1280x720 이상 해상도만 지원
- **반응형 레이아웃**: 화면 크기에 따른 자동 최적화
- **모듈화된 컴포넌트**: 재사용 가능한 UI 컴포넌트
- **일관된 디자인**: 통일된 스타일과 애니메이션

## 🏗️ 아키텍처

### 핵심 컴포넌트

```
LandscapeLayout/
├── LandscapeLayout.tsx      # 메인 레이아웃 컨테이너
├── LandscapeMenuPanel.tsx   # 좌/우측 메뉴 패널
├── LandscapeSection.tsx     # 섹션 구분자
├── LandscapeCard.tsx        # 카드 컨테이너
└── LandscapeButton.tsx      # 버튼 컴포넌트
```

### 유틸리티 훅

```
useLandscapeLayout/
├── useLandscapeLayout.ts     # 기본 레이아웃 상태
├── useLandscapeOptimization.ts # 최적화 로직
└── useLandscapeClasses.ts    # CSS 클래스 생성
```

## 🚀 사용법

### 기본 레이아웃 구조

```tsx
import LandscapeLayout, {
  LandscapeMenuPanel,
  LandscapeSection,
  LandscapeCard,
  LandscapeButton,
} from '../components/LandscapeLayout'

export default function MyScene() {
  return (
    <div className="my-scene-layout landscape-layout">
      <GameHeader location="씬 이름" />

      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="좌측 패널" subtitle="설명">
            <LandscapeSection title="섹션 제목">
              <LandscapeCard>{/* 콘텐츠 */}</LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
        rightPanel={
          <LandscapeMenuPanel title="우측 패널" subtitle="설명">
            {/* 우측 콘텐츠 */}
          </LandscapeMenuPanel>
        }
      >
        {/* 중앙 콘텐츠 */}
        <div className="center-area landscape-center-content">{/* 메인 콘텐츠 */}</div>
      </LandscapeLayout>
    </div>
  )
}
```

### 해상도 및 방향 검증

```tsx
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'

export default function MyScene() {
  const { canDisplayGame } = useLandscapeLayout()

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!canDisplayGame) {
    return null // App.tsx에서 처리됨
  }

  return (
    // 씬 콘텐츠
  )
}
```

### 최적화 훅 사용

```tsx
import { useLandscapeOptimization } from '../hooks/useLandscapeLayout'

export default function MyScene() {
  const { getOptimalPanelWidth, getOptimalGridColumns } = useLandscapeOptimization()

  const panelWidth = getOptimalPanelWidth() // 240-320px
  const gridColumns = getOptimalGridColumns() // 2-4개

  return <div style={{ width: panelWidth }}>{/* 최적화된 레이아웃 */}</div>
}
```

## 🎨 CSS 클래스 시스템

### 기본 클래스

- `.landscape-layout`: 메인 레이아웃 컨테이너
- `.landscape-panel`: 좌/우측 패널
- `.landscape-center-content`: 중앙 콘텐츠 영역
- `.landscape-grid`: 그리드 레이아웃
- `.landscape-card`: 카드 스타일

### 상태 클래스

- `.landscape-fade-in`: 페이드인 애니메이션
- `.landscape-slide-in`: 슬라이드인 애니메이션
- `.landscape-hidden`: 숨김 처리
- `.landscape-visible`: 표시 처리

### 반응형 클래스

- `.landscape-1600+`: 1600px 이상
- `.landscape-1366+`: 1366px 이상
- `.landscape-1024+`: 1024px 이상

## 📱 해상도 지원

### 지원 해상도

- **최소**: 1280x720 (720p)
- **권장**: 1920x1080 (Full HD)
- **최적**: 2560x1440 (2K) 이상

### 미지원 해상도

- 1280x720 미만
- 세로형 디스플레이
- 모바일 세로 모드

## 🔧 마이그레이션 가이드

### 기존 씬 업데이트

1. **import 추가**

```tsx
import LandscapeLayout, { ... } from '../components/LandscapeLayout'
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'
```

2. **해상도 검증 추가**

```tsx
const { canDisplayGame } = useLandscapeLayout()

if (!canDisplayGame) {
  return null
}
```

3. **기존 UI 컴포넌트 교체**

```tsx
// 기존
<MenuPanel position="left">
  <MenuSection title="제목">
    {/* 콘텐츠 */}
  </MenuSection>
</MenuPanel>

// 새로운
<LandscapeLayout
  leftPanel={
    <LandscapeMenuPanel title="제목" subtitle="설명">
      <LandscapeSection title="섹션">
        <LandscapeCard>
          {/* 콘텐츠 */}
        </LandscapeCard>
      </LandscapeSection>
    </LandscapeMenuPanel>
  }
>
  {/* 중앙 콘텐츠 */}
</LandscapeLayout>
```

## 📋 마이그레이션 완료된 씬

- ✅ `Lobby.tsx` - 로비 씬
- ✅ `Training.tsx` - 훈련소 씬
- ✅ `Skills.tsx` - 스킬 씬
- ✅ `MatchQueue.tsx` - 매칭 대기 씬
- ✅ `MatchConfirm.tsx` - 매칭 확인 씬
- ✅ `MatchPrep.tsx` - 전투 준비 씬
- ✅ `Result.tsx` - 전투 결과 씬
- ✅ `Login.tsx` - 로그인 씬 (해상도 검증만)
- ✅ `Battle.tsx` - 전투 씬 (해상도 검증만)

## 🎯 다음 단계

### 계획된 개선사항

1. **애니메이션 강화**

   - 전환 효과 개선
   - 마이크로 인터랙션 추가

2. **성능 최적화**

   - 렌더링 최적화
   - 메모리 사용량 개선

3. **접근성 향상**

   - 키보드 네비게이션
   - 스크린 리더 지원

4. **테마 시스템**
   - 다크/라이트 모드
   - 커스텀 색상 팔레트

## 🐛 문제 해결

### 일반적인 문제

1. **레이아웃 깨짐**

   - CSS 클래스 확인
   - 해상도 검증 로직 점검

2. **성능 이슈**

   - 불필요한 리렌더링 확인
   - 메모리 누수 점검

3. **반응형 문제**
   - 미디어 쿼리 확인
   - 브라우저 개발자 도구 활용

## 📚 참고 자료

- [React 공식 문서](https://react.dev/)
- [CSS Grid 가이드](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [Flexbox 가이드](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)

## 🤝 기여하기

새로운 가로형 레이아웃 컴포넌트나 개선사항을 제안하려면:

1. 이슈 생성
2. 기능 요청 제출
3. 풀 리퀘스트 생성

모든 기여는 가로형 디스플레이와 720p+ 해상도 최적화 원칙을 따라야 합니다.
