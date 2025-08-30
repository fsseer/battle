import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useResourceSync } from '../hooks/useResourceSync'
import { useTokenValidation } from '../hooks/useTokenValidation'
import GameHeader from '../components/GameHeader'
// import { useApRecovery } from '../hooks/useApRecovery' // 성능 문제로 완전 비활성화
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

  const handleInitialSync = useCallback(async () => {
    const result = await syncUserResources()
    if (result?.success && result.data?.character) {
      setCharacterData(result.data.character)
    }
  }, [syncUserResources])

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
  }, [user, navigate, resourcesSynced, handleInitialSync])

  // AP 자동 회복 활성화 (로비에서만 필요할 때)
  // useApRecovery() // 성능 문제로 임시 비활성화

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
        navigate('/market')
        break
      case 'coliseum':
        // 콜로세움 → 매칭 준비(서버에 매칭 요청) 화면으로 이동
        navigate('/match')
        break
      case 'restaurant':
        navigate('/restaurant')
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

      {/* 메인 콘텐츠 - 중앙 콘텐츠만 표시 */}
      <div className="center-content-wrapper">
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
      </div>

      {/* 시스템 모달 */}
      {showSystemModal && (
        <div className="system-modal-overlay" onClick={() => setShowSystemModal(false)}>
          <div className="system-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>시스템 메뉴</h3>
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
