import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useResourceSync } from '../hooks/useResourceSync'
import { useTokenValidation } from '../hooks/useTokenValidation'
import GameHeader from '../components/GameHeader'
// import { useApRecovery } from '../hooks/useApRecovery' // 성능 문제로 완전 비활성화
import LandscapeLayout, {
  LandscapeMenuPanel,
  LandscapeSection,
  LandscapeCard,
  LandscapeButton,
} from '../components/LandscapeLayout'
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'

export default function Lobby() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [characterData, setCharacterData] = useState<{
    level: number
    exp: number
    reputation: number
  } | null>(null)
  const [resourcesSynced, setResourcesSynced] = useState(false)
  const [showSystemModal, setShowSystemModal] = useState(false)

  // 가로형 레이아웃 상태 및 최적화 훅 사용
  const { canDisplayGame } = useLandscapeLayout()

  // 공통 자원 동기화 훅 사용
  const { syncUserResources } = useResourceSync()

  // 토큰 유효성 검증 훅 사용
  useTokenValidation()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }

    // 로비 입장시에만 서버와 자원 정보 싱크 (한 번만)
    if (!resourcesSynced) {
      handleInitialSync()
      setResourcesSynced(true)
    }
  }, [user, navigate, resourcesSynced])

  // AP 자동 회복 활성화 (로비에서만 필요할 때)
  // useApRecovery() // 성능 문제로 임시 비활성화

  const handleInitialSync = async () => {
    const result = await syncUserResources()
    if (result?.success && result.data?.character) {
      setCharacterData(result.data.character)
    }
  }

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
      case 'blacksmith':
        // TODO: 대장간 씬 구현
        console.log('대장간으로 이동')
        break
      case 'market':
        // TODO: 시장 씬 구현
        console.log('시장으로 이동')
        break
      case 'coliseum':
        // TODO: 콜로세움 씬 구현
        console.log('콜로세움으로 이동')
        break
      case 'restaurant':
        // TODO: 식당 씬 구현
        console.log('식당으로 이동')
        break
      case 'stats':
        // TODO: 능력치 씬 구현
        console.log('능력치로 이동')
        break
      case 'equipment':
        // TODO: 장비 씬 구현
        console.log('장비로 이동')
        break
      case 'consumables':
        // TODO: 소모품 씬 구현
        console.log('소모품으로 이동')
        break
      default:
        break
    }
  }

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!canDisplayGame) {
    return null // App.tsx에서 처리됨
  }

  console.log('[Lobby] 렌더링 시작 - characterData:', characterData)
  console.log('[Lobby] canDisplayGame:', canDisplayGame)

  return (
    <div className="lobby-layout">
      {/* 상단 헤더 */}
      <GameHeader onSystemMenuClick={() => setShowSystemModal(true)} />

      {/* 배경 이미지 */}
      <div
        className="lobby-background"
        style={{ backgroundImage: 'url(/images/lobby-background.jpg)' }}
      />

      {/* 메인 콘텐츠 - 새로운 가로형 레이아웃 사용 */}
      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="캐릭터 정보" subtitle="상태 및 장비">
            {/* 캐릭터 상태 */}
            <LandscapeSection title="캐릭터 상태">
              <LandscapeCard>
                <div className="landscape-status-grid">
                  <div className="status-item">
                    <span className="status-label">레벨</span>
                    <span className="status-value">{characterData?.level || 1}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">경험치</span>
                    <span className="status-value">{characterData?.exp || 0}/100</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">명성</span>
                    <span className="status-value">{characterData?.reputation || 0}</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            {/* 장비 */}
            <LandscapeSection title="장비">
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

            {/* 스킬 */}
            <LandscapeSection title="스킬">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item available">
                    <span className="item-label">베기</span>
                    <span className="item-value">사용 가능</span>
                  </div>
                  <div className="list-item available">
                    <span className="item-label">가드</span>
                    <span className="item-value">사용 가능</span>
                  </div>
                  <div className="list-item locked">
                    <span className="item-label">급습</span>
                    <span className="item-value">잠김</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            {/* 시스템 기능 */}
            <LandscapeSection title="시스템">
              <div className="landscape-grid">
                <LandscapeButton
                  onClick={() => setShowSystemModal(true)}
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
          <LandscapeMenuPanel title="게임 메뉴" subtitle="위치 이동 및 기능">
            {/* 퀘스트 섹션 */}
            <LandscapeSection title="퀘스트">
              <LandscapeCard>
                <div className="quest-section">
                  <div className="quest-item">
                    <div className="quest-icon">📜</div>
                    <div className="quest-info">
                      <div className="quest-title">노력하는 검투사</div>
                      <div className="quest-progress">0/5 완료</div>
                    </div>
                  </div>
                  <div className="quest-item">
                    <div className="quest-icon">🏛️</div>
                    <div className="quest-info">
                      <div className="quest-title">콜로세움 도전</div>
                      <div className="quest-progress">0/3 완료</div>
                    </div>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            {/* 메인 액션 섹션 */}
            <LandscapeSection title="주요 이동">
              <LandscapeCard>
                <LandscapeButton
                  onClick={() => handleLocationMove('training')}
                  className="main-action-btn"
                >
                  ⚔️ 훈련소로 이동
                </LandscapeButton>
                <p className="action-hint">훈련소로 이동합니다</p>
              </LandscapeCard>
            </LandscapeSection>

            {/* 빠른 이동 */}
            <LandscapeSection title="빠른 이동">
              <div className="landscape-grid">
                <LandscapeButton onClick={() => handleLocationMove('skills')} variant="success">
                  🛡️ 스킬
                </LandscapeButton>
                <LandscapeButton onClick={() => handleLocationMove('match')} variant="primary">
                  ⚔️ 전투
                </LandscapeButton>
              </div>
            </LandscapeSection>

            {/* 추가 위치 */}
            <LandscapeSection title="추가 위치">
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
                  🏛️ 콜로세움
                </LandscapeButton>
                <LandscapeButton
                  onClick={() => handleLocationMove('restaurant')}
                  variant="secondary"
                >
                  🍽️ 식당
                </LandscapeButton>
              </div>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
      >
        {/* 중앙 배경 영역 - Epic Seven 스타일의 하단 메뉴 바 */}
        <div className="center-background-area">
          {/* 하단 메뉴 바 - Epic Seven 스타일 */}
          <div className="bottom-menu-bar">
            {/* 좌측 메인 메뉴 아이콘들 */}
            <div className="main-menu-icons">
              <button className="menu-icon-btn" onClick={() => handleLocationMove('stats')}>
                <span className="icon">📊</span>
                <span className="label">능력치</span>
              </button>
              <button className="menu-icon-btn" onClick={() => handleLocationMove('equipment')}>
                <span className="icon">⚔️</span>
                <span className="label">장비</span>
              </button>
              <button className="menu-icon-btn" onClick={() => handleLocationMove('skills')}>
                <span className="icon">🛡️</span>
                <span className="label">스킬</span>
              </button>
              <button className="menu-icon-btn" onClick={() => handleLocationMove('consumables')}>
                <span className="icon">🧪</span>
                <span className="label">소모품</span>
              </button>
            </div>

            {/* 우측 콘텐츠 이동 아이콘들 */}
            <div className="content-move-icons">
              <button className="menu-icon-btn" onClick={() => handleLocationMove('training')}>
                <span className="icon">🏋️</span>
                <span className="label">훈련장</span>
              </button>
              <button className="menu-icon-btn" onClick={() => handleLocationMove('restaurant')}>
                <span className="icon">🍽️</span>
                <span className="label">식당</span>
              </button>
              <button className="menu-icon-btn" onClick={() => handleLocationMove('blacksmith')}>
                <span className="icon">🔨</span>
                <span className="label">대장간</span>
              </button>
              <button className="menu-icon-btn" onClick={() => handleLocationMove('market')}>
                <span className="icon">🛒</span>
                <span className="label">시장</span>
              </button>
              <button className="menu-icon-btn" onClick={() => handleLocationMove('coliseum')}>
                <span className="icon">🏛️</span>
                <span className="label">콜로세움</span>
              </button>
            </div>
          </div>
        </div>
      </LandscapeLayout>

      {/* 시스템 모달 */}
      {showSystemModal && (
        <div className="system-modal-overlay" onClick={() => setShowSystemModal(false)}>
          <div className="system-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>시스템 메뉴</h3>
              <button className="close-btn" onClick={() => setShowSystemModal(false)}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <button className="modal-btn" onClick={() => console.log('설정')}>
                ⚙️ 설정
              </button>
              <button className="modal-btn" onClick={() => console.log('도움말')}>
                ❓ 도움말
              </button>
              <button className="modal-btn danger" onClick={handleLogout}>
                🚪 로그아웃
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
