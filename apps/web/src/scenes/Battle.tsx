import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { socket } from '../lib/socket.ts'
import { useTokenValidation } from '../hooks/useTokenValidation'
import ResourceBar from '../components/ResourceBar'
import { Hearts } from '../components/Battle/Hearts'
import { MomentumBar } from '../components/Battle/MomentumBar'
import { SkillButton } from '../components/Battle/SkillButton'
import { battleReducer, createInitialState } from './battleReducer'
import { loadAssets } from '../lib/assets'
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'

type Role = 'ATTACK' | 'DEFENSE'
type Skill = { id: string; name: string; role: Role }

// 서버 규칙과 동일: 공격(light/heavy/poke), 방어(block/dodge/counter)
const SKILLS: Skill[] = [
  { id: 'light', name: '약공', role: 'ATTACK' },
  { id: 'heavy', name: '강공', role: 'ATTACK' },
  { id: 'poke', name: '견제', role: 'ATTACK' },
  { id: 'block', name: '막기', role: 'DEFENSE' },
  { id: 'dodge', name: '회피', role: 'DEFENSE' },
  { id: 'counter', name: '반격', role: 'DEFENSE' },
]

interface BattleState {
  opponent: string
  role: string
  myInfo: any
  opponentInfo: any
}

export default function Battle() {
  const navigate = useNavigate()
  const location = useLocation()
  const battleData = location.state as BattleState

  // 가로형 레이아웃 상태 및 최적화 훅 사용
  const { canDisplayGame } = useLandscapeLayout()

  const [state, dispatch] = useReducer(
    battleReducer,
    createInitialState(battleData?.role || 'ATTACK')
  )
  const {
    round,
    role,
    choice,
    oppChoice: opponentChoice,
    log,
    momentum,
    selfHp,
    selfMaxHp,
    oppHp,
    oppMaxHp,
    selfInjuries,
    oppInjuries,
  } = state as any

  const [timeLeft, setTimeLeft] = useState(10)
  const timerRef = useRef<number | null>(null)

  // Camera shake & hitstop
  const [shakeMs, setShakeMs] = useState(0)
  const [hitstopMs, setHitstopMs] = useState(0)
  const [cam, setCam] = useState({ x: 0, y: 0 })
  const frameRef = useRef<number | null>(null)
  const [spark, setSpark] = useState<{ x: number; y: number; t: number } | null>(null)
  type Particle = { x: number; y: number; vx: number; vy: number; life: number; ttl: number }
  const [particles, setParticles] = useState<Particle[]>([])
  const [trail, setTrail] = useState<{ id: string; t: number; ttl: number } | null>(null)

  const available = useMemo(() => SKILLS.filter((s) => s.role === role), [role])

  // 토큰 유효성 검증 훅 사용
  useTokenValidation()

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!canDisplayGame) {
    return null // App.tsx에서 처리됨
  }

  useEffect(() => {
    if (!battleData) {
      navigate('/match')
      return
    }

    // 서버 연결 이벤트
    const onHello = (m: { id: string }) => console.log('server.hello', m)
    const onFound = (m: unknown) => console.log('match.found', m)
    const onBattleStart = (m: any) => {
      console.log('battle.start', m)
      // 전투 시작 이벤트 처리
    }
    const onBattleResolve = (m: any) => {
      console.log('battle.resolve', m)
      resolveRound(m)
    }
    const onBattleDecisive = (m: any) => {
      console.log('battle.decisive', m)
      // 결정타 이벤트 처리
    }
    const onBattleEnd = (m: any) => {
      console.log('battle.end', m)
      // 전투 종료 처리
      navigate('/result', { state: { result: m } })
    }

    socket.on('server.hello', onHello)
    socket.on('match.found', onFound)
    socket.on('battle.start', onBattleStart)
    socket.on('battle.resolve', onBattleResolve)
    socket.on('battle.decisive', onBattleDecisive)
    socket.on('battle.end', onBattleEnd)

    return () => {
      socket.off('server.hello', onHello)
      socket.off('match.found', onFound)
      socket.off('battle.start', onBattleStart)
      socket.off('battle.resolve', onBattleResolve)
      socket.off('battle.decisive', onBattleDecisive)
      socket.off('battle.end', onBattleEnd)
    }
  }, [navigate, battleData])

  useEffect(() => {
    loadAssets().catch(() => {})
  }, [])

  useEffect(() => {
    // 라운드 타이머
    if (timerRef.current) window.clearInterval(timerRef.current)
    setTimeLeft(10)
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (hitstopMs > 0) return t // 히트스톱 중엔 시간 멈춤
        if (t <= 1) {
          window.clearInterval(timerRef.current!)
          // 시간 초과 시 자동 선택 (기본 스킬)
          const defaultSkill = available[0]?.id || 'light'
          onSelect(defaultSkill)
        }
        return t - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [round, hitstopMs, available])

  const resolveRound = useCallback(
    (msg: { round: number; self: string; opp: string; result: 0 | 1 | 2; nextRole: Role }) => {
      dispatch({ type: 'resolve', msg })
    },
    []
  )

  const onSelect = (id: string) => {
    dispatch({ type: 'select', id })
    // 스윙 트레일 시작
    setTrail({ id, t: 160, ttl: 160 })
    // 서버에 선택 전송
    socket.emit('battle.choose', id)
  }

  // 카메라 흔들림 효과
  useEffect(() => {
    if (shakeMs <= 0) return
    const frame = () => {
      setCam({
        x: (Math.random() - 0.5) * 8,
        y: (Math.random() - 0.5) * 8,
      })
      frameRef.current = requestAnimationFrame(frame)
    }
    frameRef.current = requestAnimationFrame(frame)
    const timer = setTimeout(() => {
      setShakeMs(0)
      setCam({ x: 0, y: 0 })
    }, shakeMs)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      clearTimeout(timer)
    }
  }, [shakeMs])

  // 히트스톱 효과
  useEffect(() => {
    if (hitstopMs <= 0) return
    const timer = setTimeout(() => setHitstopMs(0), hitstopMs)
    return () => clearTimeout(timer)
  }, [hitstopMs])

  // 파티클 시스템
  useEffect(() => {
    if (particles.length === 0) return
    const frame = () => {
      setParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            life: p.life + 1,
          }))
          .filter((p) => p.life < p.ttl)
      )
      frameRef.current = requestAnimationFrame(frame)
    }
    frameRef.current = requestAnimationFrame(frame)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [particles])

  // 스파크 효과
  useEffect(() => {
    if (!spark) return
    const timer = setTimeout(() => setSpark(null), 200)
    return () => clearTimeout(timer)
  }, [spark])

  // 트레일 효과
  useEffect(() => {
    if (!trail) return
    const frame = () => {
      setTrail((prev) => {
        if (!prev) return null
        if (prev.t >= prev.ttl) return null
        return { ...prev, t: prev.t + 16 }
      })
      frameRef.current = requestAnimationFrame(frame)
    }
    frameRef.current = requestAnimationFrame(frame)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [trail])

  return (
    <div className="battle-scene">
      {/* 배경 */}
      <div className="battle-background">
        <div className="arena-ground" />
        <div className="arena-pillars" />
        <div className="crowd-background" />
      </div>

      {/* 전투 UI */}
      <div className="battle-ui">
        {/* 상단 정보 바 */}
        <div className="battle-header">
          <div className="round-info">
            <span className="round-label">라운드</span>
            <span className="round-number">{round}</span>
          </div>
          <div className="timer-display">
            <span className="timer-label">남은 시간</span>
            <span className="timer-value">{timeLeft}</span>
          </div>
          <div className="role-display">
            <span className="role-label">역할</span>
            <span className="role-value">{role === 'ATTACK' ? '⚔️ 공격자' : '🛡️ 방어자'}</span>
          </div>
        </div>

        {/* 캐릭터 정보 */}
        <div className="character-info-panels">
          {/* 내 캐릭터 */}
          <div className="character-panel my-character">
            <div className="character-portrait">
              <div className="character-sprite fighter-blue" />
            </div>
            <div className="character-details">
              <div className="character-name">{battleData?.myInfo?.name || '내 검투사'}</div>
              <div className="character-level">Lv.{battleData?.myInfo?.level || 1}</div>
              <Hearts current={selfHp} max={selfMaxHp} />
            </div>
            <div className="character-stats">
              <div className="stat-item">
                <span className="stat-label">근력</span>
                <span className="stat-value">{battleData?.myInfo?.stats?.str || 5}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">민첩</span>
                <span className="stat-value">{battleData?.myInfo?.stats?.agi || 5}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">체력</span>
                <span className="stat-value">{battleData?.myInfo?.stats?.sta || 5}</span>
              </div>
            </div>
          </div>

          {/* 상대방 캐릭터 */}
          <div className="character-panel opponent-character">
            <div className="character-portrait">
              <div className="character-sprite fighter-red" />
            </div>
            <div className="character-details">
              <div className="character-name">
                {battleData?.opponentInfo?.name || '상대 검투사'}
              </div>
              <div className="character-level">Lv.{battleData?.opponentInfo?.level || 1}</div>
              <Hearts current={oppHp} max={oppMaxHp} />
            </div>
            <div className="character-stats">
              <div className="stat-item">
                <span className="stat-label">근력</span>
                <span className="stat-value">{battleData?.opponentInfo?.stats?.str || 5}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">민첩</span>
                <span className="stat-value">{battleData?.opponentInfo?.stats?.agi || 5}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">체력</span>
                <span className="stat-value">{battleData?.opponentInfo?.stats?.sta || 5}</span>
              </div>
            </div>
          </div>
        </div>

        {/* 모멘텀 바 */}
        <MomentumBar momentum={momentum} />

        {/* 스킬 선택 버튼 */}
        <div className="skill-selection">
          <div className="skill-buttons">
            {available.map((skill) => (
              <SkillButton
                key={skill.id}
                skill={skill}
                isSelected={choice === skill.id}
                onSelect={() => onSelect(skill.id)}
                disabled={choice !== null}
              />
            ))}
          </div>
        </div>

        {/* 전투 로그 */}
        <div className="battle-log">
          <div className="log-header">
            <h4>⚔️ 전투 기록</h4>
          </div>
          <div className="log-content">
            {log.map((entry, index) => (
              <div key={index} className="log-entry">
                <span className="log-time">{entry.time}</span>
                <span className="log-message">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 하단 액션 바 */}
        <div className="battle-actions">
          <button
            className="action-btn surrender-btn"
            onClick={() => {
              socket.emit('battle.surrender')
              navigate('/result', { state: { result: { reason: 'surrender' } } })
            }}
          >
            🏳️ 항복
          </button>
          <button className="action-btn escape-btn" onClick={() => navigate('/lobby')}>
            🏃 도망
          </button>
        </div>
      </div>

      {/* 시각적 효과들 */}
      {shakeMs > 0 && (
        <div
          className="camera-shake"
          style={{
            transform: `translate(${cam.x}px, ${cam.y}px)`,
          }}
        />
      )}

      {spark && (
        <div
          className="spark-effect"
          style={{
            left: spark.x,
            top: spark.y,
            transform: `scale(${1 - spark.t / 200})`,
          }}
        >
          ✨
        </div>
      )}

      {trail && (
        <div
          className="swing-trail"
          style={{
            opacity: 1 - trail.t / trail.ttl,
            transform: `rotate(${trail.t * 2}deg)`,
          }}
        >
          ⚔️
        </div>
      )}

      {/* 파티클 효과 */}
      {particles.map((particle, index) => (
        <div
          key={index}
          className="particle"
          style={{
            left: particle.x,
            top: particle.y,
            opacity: 1 - particle.life / particle.ttl,
            transform: `scale(${1 - particle.life / particle.ttl})`,
          }}
        >
          ✨
        </div>
      ))}
    </div>
  )
}
