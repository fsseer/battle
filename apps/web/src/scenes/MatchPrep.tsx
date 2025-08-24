import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket.ts'
import { SERVER_ORIGIN } from '../lib/api'
import { useAuthStore } from '../store/auth'
import ResourceBar from '../components/ResourceBar'
import GameHeader from '../components/GameHeader'
import LandscapeLayout, {
  LandscapeMenuPanel,
  LandscapeSection,
  LandscapeCard,
  LandscapeButton,
} from '../components/LandscapeLayout'
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'

export default function MatchPrep() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const token = (user as any)?.token
  const [busy, setBusy] = useState(false)
  const [catalog, setCatalog] = useState<any[]>([])
  const [basicOpen, setBasicOpen] = useState(true)
  const [weaponOpen, setWeaponOpen] = useState(true)
  const [strOpen, setStrOpen] = useState(false)
  const [agiOpen, setAgiOpen] = useState(false)
  const [intOpen, setIntOpen] = useState(false)
  const [oneOpen, setOneOpen] = useState(false)
  const [twoOpen, setTwoOpen] = useState(false)
  const [dualOpen, setDualOpen] = useState(false)

  // 가로형 레이아웃 상태 및 최적화 훅 사용
  const { canDisplayGame } = useLandscapeLayout()

  // Deprecated: 이 화면은 곧 제거 예정. Training.tsx로 분리됨.
  useEffect(() => {
    let mounted = true
    fetch(`${SERVER_ORIGIN}/training/catalog`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (mounted && j?.ok) setCatalog(j.items)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  // 훈련 실행 VFX(간단한 메시지 플래시)
  const [flash, setFlash] = useState<string>('')
  const flashTimer = useRef<number | null>(null)

  async function call(path: string, payload: any) {
    if (!token) return
    setBusy(true)
    try {
      const r = await fetch(`${SERVER_ORIGIN}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })
      const j = await r.json().catch(() => null)
      if (j?.ok) {
        setFlash('훈련 완료!')
        if (flashTimer.current) window.clearTimeout(flashTimer.current)
        flashTimer.current = window.setTimeout(() => setFlash(''), 900)
        const m = await fetch(`${SERVER_ORIGIN}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then((res) => res.json())
          .catch(() => null)
        if (m?.ok)
          setUser({ id: m.user.id, name: m.user.name, token, characters: m.user.characters })
      } else if (j?.error === 'NOT_ENOUGH_AP') {
        alert('AP가 부족합니다.')
      }
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    const onFound = (m: unknown) => {
      console.log('match.found', m)
      navigate('/battle')
    }
    const onHello = (m: unknown) => console.log('server.hello', m)
    const onConnect = () => console.log('socket connected', socket.id)
    const onError = (e: unknown) => console.error('socket error', e)

    socket.on('connect', onConnect)
    socket.on('server.hello', onHello)
    socket.on('match.found', onFound)
    socket.on('connect_error', onError)
    return () => {
      socket.off('connect', onConnect)
      socket.off('server.hello', onHello)
      socket.off('match.found', onFound)
      socket.off('connect_error', onError)
    }
  }, [navigate])

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!canDisplayGame) {
    return null // App.tsx에서 처리됨
  }

  return (
    <div className="match-prep-layout landscape-layout">
      {/* 상단 헤더 */}
      <GameHeader location="대전 준비" />

      {/* 메인 콘텐츠 - 새로운 가로형 레이아웃 사용 */}
      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="🏋️ 훈련 카테고리" subtitle="기초 및 무기술 훈련">
            <LandscapeSection title="💪 기초 훈련">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">힘 훈련</span>
                    <span className="item-value">근력 증가</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">민첩 훈련</span>
                    <span className="item-value">민첩성 증가</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">지능 훈련</span>
                    <span className="item-value">지능 증가</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="⚔️ 무기술 훈련">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">한손검</span>
                    <span className="item-value">검술 숙련</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">양손검</span>
                    <span className="item-value">대검 숙련</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">쌍검</span>
                    <span className="item-value">쌍검 숙련</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
        rightPanel={
          <LandscapeMenuPanel title="🎮 게임 액션" subtitle="매칭 및 이동">
            <LandscapeSection title="⚔️ 전투 매칭">
              <LandscapeCard>
                <LandscapeButton
                  onClick={() => navigate('/match')}
                  variant="primary"
                  className="match-btn"
                >
                  ⚔️ 전투 매칭 시작
                </LandscapeButton>
                <p className="action-hint">다른 플레이어와 전투를 시작합니다</p>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="🏛️ 로비 이동">
              <LandscapeCard>
                <LandscapeButton
                  onClick={() => navigate('/lobby')}
                  variant="secondary"
                  className="back-btn"
                >
                  🏛️ 로비로 돌아가기
                </LandscapeButton>
                <p className="action-hint">로비로 돌아갑니다</p>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
      >
        {/* 중앙 대전 준비 영역 */}
        <div className="match-prep-center-area landscape-center-content">
          <div className="match-prep-info">
            <h2>⚔️ 대전 준비</h2>
            <p>전투 전에 훈련을 통해 능력을 향상시키세요</p>

            {flash ? (
              <div className="flash-message">
                <span className="flash-text">{flash}</span>
              </div>
            ) : null}

            <div className="resource-display">
              <ResourceBar />
            </div>

            <div className="prep-tips">
              <h4>💡 준비 팁</h4>
              <div className="landscape-list">
                <div className="list-item">
                  <span className="item-label">훈련</span>
                  <span className="item-value">기초 능력 향상</span>
                </div>
                <div className="list-item">
                  <span className="item-label">무기술</span>
                  <span className="item-value">전투 기술 숙련</span>
                </div>
                <div className="list-item">
                  <span className="item-label">전략</span>
                  <span className="item-value">상대방 분석</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </LandscapeLayout>
    </div>
  )
}
