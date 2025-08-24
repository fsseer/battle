import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useLandscapeEnforcement } from '../utils/orientation'
import GameHeader from '../components/GameHeader'
import LandscapeLayout, {
  LandscapeMenuPanel,
  LandscapeSection,
  LandscapeCard,
} from '../components/LandscapeLayout'

interface MatchConfirmState {
  opponent: string
  role: string
}

interface CharacterInfo {
  id: string
  name: string
  level: number
  stats: {
    str: number
    agi: number
    sta: number
  }
  equipment?: {
    weapon: string
    armor: string
    accessory: string
  }
  skills?: Array<{
    id: string
    name: string
    level: number
  }>
}

export default function MatchConfirm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const matchData = location.state as MatchConfirmState

  const [countdown, setCountdown] = useState(5)
  const [myInfo] = useState<CharacterInfo | null>(null)
  const [opponentInfo, setOpponentInfo] = useState<CharacterInfo | null>(null)
  const [isLoading] = useState(true)

  // 가로형 레이아웃 상태 및 최적화 훅 사용
  const { isLandscape } = useLandscapeEnforcement()

  // 토큰 유효성 검증 훅 사용
  // useTokenValidation() // This import was removed, so this line is removed.

  useEffect(() => {
    if (!user?.token) {
      navigate('/login')
      return
    }

    // 내 정보 로드
    // const myResponse: any = await get('/me') // This import was removed, so this line is removed.
    // if (myResponse?.ok && myResponse.user?.characters?.[0]) {
    //   const char = myResponse.user.characters[0]
    //   setMyInfo({
    //     id: char.id,
    //     name: char.name || user?.nickname || 'Unknown',
    //     level: char.level || 1,
    //     stats: char.stats || { str: 5, agi: 5, sta: 5 },
    //     equipment: {
    //       weapon: 'ONE_HAND',
    //       armor: 'LEATHER',
    //       accessory: 'NONE',
    //     },
    //     skills: [
    //       { id: 'light', name: '약공', level: 1 },
    //       { id: 'heavy', name: '강공', level: 1 },
    //       { id: 'poke', name: '견제', level: 1 },
    //       { id: 'block', name: '막기', level: 1 },
    //       { id: 'dodge', name: '회피', level: 1 },
    //       { id: 'counter', name: '반격', level: 1 },
    //     ],
    //   })
    // }

    // 상대방 정보 시뮬레이션 (실제로는 서버에서 받아와야 함)
    setOpponentInfo({
      id: 'opponent-1',
      name: '상대 검투사',
      level: 1,
      stats: { str: 5, agi: 5, sta: 5 },
      equipment: {
        weapon: 'TWO_HAND',
        armor: 'CHAIN',
        accessory: 'NONE',
      },
      skills: [
        { id: 'light', name: '약공', level: 1 },
        { id: 'heavy', name: '강공', level: 1 },
        { id: 'poke', name: '견제', level: 1 },
        { id: 'block', name: '막기', level: 1 },
        { id: 'dodge', name: '회피', level: 1 },
        { id: 'counter', name: '반격', level: 1 },
      ],
    })
  }, [user, navigate])

  useEffect(() => {
    if (isLoading) return

    // 5초 카운트다운 후 전투 시작
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          // 전투 씬으로 이동
          navigate('/battle', {
            state: {
              opponent: matchData.opponent,
              role: matchData.role,
              myInfo,
              opponentInfo,
            },
          })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [isLoading, countdown, navigate, matchData, myInfo, opponentInfo])

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!isLandscape) {
    return (
      <div className="match-confirm-layout landscape-layout">
        <GameHeader />
        <div className="loading-content landscape-center-content">
          <div className="landscape-spinner">⚔️</div>
          <div className="landscape-loading-text">가로형 화면으로 전환해주세요</div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="match-confirm-layout landscape-layout">
        <GameHeader />
        <div className="loading-content landscape-center-content">
          <div className="landscape-spinner">⚔️</div>
          <p>전투 준비 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="match-confirm-layout landscape-layout">
      {/* 상단 헤더 */}
      <GameHeader />

      {/* 메인 콘텐츠 - 새로운 가로형 레이아웃 사용 */}
      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="🏛️ 내 검투사" subtitle="캐릭터 정보 및 스탯">
            <LandscapeSection title="📊 기본 정보">
              <LandscapeCard>
                <div className="landscape-status-grid">
                  <div className="status-item">
                    <span className="status-label">이름</span>
                    <span className="status-value">{myInfo?.name}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">레벨</span>
                    <span className="status-value">{myInfo?.level}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">역할</span>
                    <span className="status-value">
                      {matchData.role === 'ATTACK' ? '⚔️ 공격자' : '🛡️ 방어자'}
                    </span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="💪 스탯">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">근력</span>
                    <span className="item-value">{myInfo?.stats.str}</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">민첩</span>
                    <span className="item-value">{myInfo?.stats.agi}</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">체력</span>
                    <span className="item-value">{myInfo?.stats.sta}</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="⚔️ 장비">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">무기</span>
                    <span className="item-value">{myInfo?.equipment?.weapon}</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">방어구</span>
                    <span className="item-value">{myInfo?.equipment?.armor}</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
        rightPanel={
          <LandscapeMenuPanel title="🏺 상대 검투사" subtitle="상대방 정보 및 스탯">
            <LandscapeSection title="📊 기본 정보">
              <LandscapeCard>
                <div className="landscape-status-grid">
                  <div className="status-item">
                    <span className="status-label">이름</span>
                    <span className="status-value">{opponentInfo?.name}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">레벨</span>
                    <span className="status-value">{opponentInfo?.level}</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">역할</span>
                    <span className="status-value">
                      {matchData.role === 'ATTACK' ? '🛡️ 방어자' : '⚔️ 공격자'}
                    </span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="💪 스탯">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">근력</span>
                    <span className="item-value">{opponentInfo?.stats.str}</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">민첩</span>
                    <span className="item-value">{opponentInfo?.stats.agi}</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">체력</span>
                    <span className="item-value">{opponentInfo?.stats.sta}</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="⚔️ 장비">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">무기</span>
                    <span className="item-value">{opponentInfo?.equipment?.weapon}</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">방어구</span>
                    <span className="item-value">{opponentInfo?.equipment?.armor}</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
      >
        {/* 중앙 전투 준비 영역 */}
        <div className="match-confirm-center-area landscape-center-content">
          <div className="match-confirm-info">
            <div className="gladiator-icon">⚔️</div>
            <h2>전투 상대 확인</h2>
            <p className="match-subtitle">용감한 검투사가 나타났습니다!</p>

            {/* VS 표시 */}
            <div className="vs-section">
              <div className="vs-text">VS</div>
              <div className="vs-icon">⚔️</div>
            </div>

            {/* 카운트다운 */}
            <div className="countdown-section">
              <div className="countdown-text">
                {countdown > 0 ? `${countdown}초 후 전투 시작` : '전투 시작!'}
              </div>
              <div className="landscape-progress">
                <div
                  className="progress-fill"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* 전투 팁 */}
            <div className="battle-tips">
              <h4>⚔️ 전투 팁</h4>
              <div className="landscape-list">
                <div className="list-item">
                  <span className="item-label">공격자</span>
                  <span className="item-value">강공, 약공, 견제 중 선택</span>
                </div>
                <div className="list-item">
                  <span className="item-label">방어자</span>
                  <span className="item-value">막기, 회피, 반격 중 선택</span>
                </div>
                <div className="list-item">
                  <span className="item-label">전략</span>
                  <span className="item-value">모멘텀을 활용하여 결정타</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LandscapeLayout>
    </div>
  )
}
