import React from 'react'
import { useAuthStore } from '../store/auth'
import { useGameStore } from '../store/game'
import { useNavigate } from 'react-router-dom'
import LandscapeLayout, {
  LandscapeMenuPanel,
  LandscapeSection,
  LandscapeCard,
  LandscapeButton,
} from './LandscapeLayout'
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'
import GameHeader from './GameHeader'
import PerformanceMonitor from './PerformanceMonitor'

export default function LobbyNew() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { character, resources } = useGameStore()

  // 가로형 레이아웃 상태 및 최적화 훅 사용
  const { canDisplayGame, width, height } = useLandscapeLayout()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleLocationMove = (location: string) => {
    switch (location) {
      case 'training':
        navigate('/training')
        break
      case 'skills':
        navigate('/skills')
        break
      case 'match':
        navigate('/match')
        break
      case 'blacksmith':
        console.log('대장간으로 이동')
        break
      case 'market':
        console.log('시장으로 이동')
        break
      case 'coliseum':
        console.log('콜로세움으로 이동')
        break
      case 'tavern':
        console.log('술집으로 이동')
        break
      default:
        break
    }
  }

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!canDisplayGame) {
    return null // App.tsx에서 처리됨
  }

  return (
    <div className="lobby-new-layout landscape-layout">
      {/* 상단 헤더 */}
      <GameHeader location="로비 (새로운 레이아웃)" />

      {/* 메인 콘텐츠 - 새로운 가로형 레이아웃 사용 */}
      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="🏛️ 캐릭터 정보" subtitle="상태 및 장비">
            {/* 캐릭터 상태 */}
            <LandscapeSection title="📊 기본 정보">
              <LandscapeCard>
                <div className="landscape-status-grid">
                  <div className="status-item">
                    <span className="status-label">이름</span>
                    <span className="status-value">{user?.nickname || 'Unknown'}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">레벨</span>
                    <span className="status-value">{character?.level || 1}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">경험치</span>
                    <span className="status-value">
                      {character?.exp || 0}/{character?.expToNext || 100}
                    </span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            {/* 자원 정보 */}
            <LandscapeSection title="💰 자원">
              <LandscapeCard>
                <div className="landscape-status-grid">
                  <div className="status-item">
                    <span className="status-label">AP</span>
                    <span className="status-value">{resources?.ap || 0}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">골드</span>
                    <span className="status-value">{resources?.gold || 0}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">명성</span>
                    <span className="status-value">{character?.reputation || 0}</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            {/* 장비 */}
            <LandscapeSection title="⚔️ 장비">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">무기</span>
                    <span className="item-value">한손검</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">방어구</span>
                    <span className="item-value">튜닉</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">장신구</span>
                    <span className="item-value">없음</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            {/* 시스템 기능 */}
            <LandscapeSection title="⚙️ 시스템">
              <div className="landscape-grid">
                <LandscapeButton
                  onClick={() => console.log('설정')}
                  variant="secondary"
                  className="landscape-icon-btn"
                >
                  ⚙️ 설정
                </LandscapeButton>
                <LandscapeButton
                  onClick={() => console.log('도움말')}
                  variant="secondary"
                  className="landscape-icon-btn"
                >
                  ❓ 도움말
                </LandscapeButton>
                <LandscapeButton
                  onClick={handleLogout}
                  variant="danger"
                  className="landscape-icon-btn"
                >
                  🚪 로그아웃
                </LandscapeButton>
              </div>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
        rightPanel={
          <LandscapeMenuPanel title="🎮 게임 메뉴" subtitle="위치 이동 및 기능">
            {/* 주요 액션 */}
            <LandscapeSection title="🚀 주요 이동">
              <LandscapeCard>
                <div className="landscape-grid">
                  <LandscapeButton
                    onClick={() => handleLocationMove('training')}
                    variant="primary"
                    className="main-action-btn"
                  >
                    🏋️ 훈련소
                  </LandscapeButton>
                  <LandscapeButton
                    onClick={() => handleLocationMove('skills')}
                    variant="success"
                    className="main-action-btn"
                  >
                    ⚔️ 스킬
                  </LandscapeButton>
                  <LandscapeButton
                    onClick={() => handleLocationMove('match')}
                    variant="primary"
                    className="main-action-btn"
                  >
                    ⚔️ 전투 매칭
                  </LandscapeButton>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            {/* 추가 위치 */}
            <LandscapeSection title="🏘️ 추가 위치">
              <div className="landscape-grid">
                <LandscapeButton
                  onClick={() => handleLocationMove('blacksmith')}
                  variant="secondary"
                >
                  🔨 대장간
                </LandscapeButton>
                <LandscapeButton onClick={() => handleLocationMove('market')} variant="secondary">
                  🛒 시장
                </LandscapeButton>
                <LandscapeButton onClick={() => handleLocationMove('coliseum')} variant="secondary">
                  ⚔️ 콜로세움
                </LandscapeButton>
                <LandscapeButton onClick={() => handleLocationMove('tavern')} variant="secondary">
                  🍺 술집
                </LandscapeButton>
              </div>
            </LandscapeSection>

            {/* 화면 정보 */}
            <LandscapeSection title="📱 화면 정보">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">해상도</span>
                    <span className="item-value">
                      {width}x{height}
                    </span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">레이아웃</span>
                    <span className="item-value">가로형 최적화</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            {/* 성능 모니터 */}
            <LandscapeSection title="📊 성능 모니터">
              <PerformanceMonitor showDetails={false} showWarnings={true} showSuggestions={true} />
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
      >
        {/* 중앙 배경 영역 */}
        <div className="lobby-center-area landscape-center-content">
          <div className="welcome-message">
            <h2>🎮 Vindex Arena에 오신 것을 환영합니다</h2>
            <p>새로운 가로형 레이아웃으로 최적화된 게임 경험을 즐겨보세요!</p>

            <div className="feature-highlights">
              <div className="feature-item">
                <span className="feature-icon">📱</span>
                <span className="feature-text">가로형 디스플레이 최적화</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🎯</span>
                <span className="feature-text">720p 이상 해상도 지원</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">⚡</span>
                <span className="feature-text">반응형 UI 컴포넌트</span>
              </div>
            </div>

            <div className="usage-guide">
              <h4>💡 사용법</h4>
              <p>좌측 패널에서 캐릭터 정보를 확인하고, 우측 패널에서 게임을 시작하세요.</p>
              <p>모든 UI 요소가 가로형 화면에 최적화되어 있습니다.</p>
            </div>
          </div>
        </div>
      </LandscapeLayout>
    </div>
  )
}
