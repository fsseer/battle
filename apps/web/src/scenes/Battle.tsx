import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTokenValidation } from '../hooks/useTokenValidation'
import { useLandscapeEnforcement } from '../utils/orientation'
import { battleReducer, createInitialState } from './battleReducer'
import type { Role } from './battleReducer'
import { socket } from '../lib/socket'
import GameHeader from '../components/GameHeader'

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
  const { isLandscape } = useLandscapeEnforcement()

  const [state, dispatch] = useReducer(
    battleReducer,
    createInitialState((battleData?.role as Role) || 'ATTACK')
  )
  const {
    round,
    role,
    log,
  } = state

  const [timeLeft, setTimeLeft] = useState(10)
  const timerRef = useRef<number | null>(null)

  // Camera shake & hitstop
  const [shakeMs, setShakeMs] = useState(0)
  const [hitstopMs, setHitstopMs] = useState(0)
  const frameRef = useRef<number | null>(null)
  const [spark, setSpark] = useState<{ x: number; y: number; t: number } | null>(null)
  type Particle = { x: number; y: number; vx: number; vy: number; life: number; ttl: number }
  const [particles, setParticles] = useState<Particle[]>([])
  const [trail, setTrail] = useState<{ id: string; t: number; ttl: number } | null>(null)

  const available = useMemo(() => SKILLS.filter((s) => s.role === role), [role])

  // 토큰 유효성 검증 훅 사용
  useTokenValidation()

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!isLandscape) {
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
      // setCam({ // Removed
      //   x: (Math.random() - 0.5) * 8,
      //   y: (Math.random() - 0.5) * 8,
      // })
      frameRef.current = requestAnimationFrame(frame)
    }
    frameRef.current = requestAnimationFrame(frame)
    const timer = setTimeout(() => {
      setShakeMs(0)
      // setCam({ x: 0, y: 0 }) // Removed
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
    <div className="battle-layout landscape-layout">
      <GameHeader />
      <div className="battle-content landscape-center-content">
        <div className="battle-info">
          <h2>전투 중...</h2>
          <p>라운드: {round}</p>
          <p>역할: {role}</p>
          <p>시간: {timeLeft}초</p>
        </div>
        
        <div className="battle-log">
          <h3>전투 로그</h3>
          {log.map((entry, index) => (
            <div key={index} className="log-entry">
              {entry}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
