import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket.ts'
import ResourceBar from '../components/ResourceBar'
import { Hearts } from '../components/Battle/Hearts'
import { MomentumBar } from '../components/Battle/MomentumBar'
import { SkillButton } from '../components/Battle/SkillButton'
import { battleReducer, createInitialState } from './battleReducer'
import { loadAssets } from '../lib/assets'

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

export default function Battle() {
  const navigate = useNavigate()
  const [state, dispatch] = useReducer(battleReducer, createInitialState('ATTACK'))
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

  useEffect(() => {
    // 서버 연결 이벤트
    const onHello = (m: { id: string }) => console.log('server.hello', m)
    const onFound = (m: unknown) => console.log('match.found', m)
    socket.on('server.hello', onHello)
    socket.on('match.found', onFound)
    return () => {
      socket.off('server.hello', onHello)
      socket.off('match.found', onFound)
    }
  }, [])

  useEffect(() => {
    loadAssets().catch(() => {})
    // 라운드 타이머
    if (timerRef.current) window.clearInterval(timerRef.current)
    setTimeLeft(10)
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (hitstopMs > 0) return t // 히트스톱 중엔 시간 멈춤
        if (t <= 1) {
          window.clearInterval(timerRef.current!)
        }
        return t - 1
      })
    }, 1000)
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current)
    }
  }, [round, hitstopMs])

  const resolveRound = useCallback((msg: { round: number; self: string; opp: string; result: 0 | 1 | 2; nextRole: Role }) => {
    dispatch({ type: 'resolve', msg })
  }, [])

  const onSelect = (id: string) => {
    dispatch({ type: 'select', id })
    // 스윙 트레일 시작
    setTrail({ id, t: 160, ttl: 160 })
    // 서버에 선택 전송
    socket.emit('battle.choose', id)
  }

  useEffect(() => {
    const onResolved = (m: {
      round: number
      self: string
      opp: string
      result: 0 | 1 | 2
      nextRole: 0 | 1
      momentum?: number
    }) => {
      // reducer에서 모멘텀/라운드/역할 처리
      // 히트스톱 & 카메라 흔들림 트리거
      setHitstopMs(120)
      setShakeMs(200)
      // 간단한 스파크 VFX
      setSpark({ x: 200, y: 110, t: 200 })
      // 파티클 스폰
      setParticles((prev) => {
        const burst: Particle[] = []
        for (let i = 0; i < 12; i++) {
          const ang = Math.random() * Math.PI * 2
          const spd = 1 + Math.random() * 2
          burst.push({
            x: 200,
            y: 110,
            vx: Math.cos(ang) * spd,
            vy: Math.sin(ang) * spd - 0.5,
            life: 300,
            ttl: 300,
          })
        }
        return [...prev, ...burst]
      })
      resolveRound({ ...m, nextRole: m.nextRole === 0 ? 'ATTACK' : 'DEFENSE' })
    }
    const onDecisive = (d: {
      round: number
      hitter: string
      target: string
      damage: number
      injured: Array<'ARM' | 'LEG' | 'TORSO'>
      hp: number
    }) => {
      const isMeTarget = d.target === socket.id
      dispatch({
        type: 'decisive',
        hitterIsMe: !isMeTarget,
        damage: d.damage ?? 1,
        injured: d.injured ?? [],
        hp: d.hp,
      })
    }
    const onEnd = (e: { reason: string; winner?: string }) => {
      dispatch({ type: 'end', reason: e.reason, winner: e.winner })
      setTimeout(() => navigate('/result'), 600)
    }
    socket.on('battle.resolve', onResolved)
    socket.on('battle.decisive', onDecisive)
    socket.on('battle.end', onEnd)
    return () => {
      socket.off('battle.resolve', onResolved)
      socket.off('battle.decisive', onDecisive)
      socket.off('battle.end', onEnd)
    }
  }, [resolveRound, navigate])

  // 프레임 루프: 히트스톱/카메라 쉐이크 처리
  useEffect(() => {
    let mounted = true
    function loop() {
      if (!mounted) return
      if (shakeMs > 0) {
        const mag = 4
        setCam({ x: (Math.random() - 0.5) * mag, y: (Math.random() - 0.5) * mag })
        setShakeMs((ms) => Math.max(0, ms - 16))
      } else {
        setCam({ x: 0, y: 0 })
      }
      if (hitstopMs > 0) setHitstopMs((ms) => Math.max(0, ms - 16))
      if (spark && spark.t > 0) setSpark((s) => (s ? { ...s, t: Math.max(0, s.t - 16) } : s))
      // 파티클 물리 업데이트
      setParticles((ps) =>
        ps.length
          ? ps
              .map((p) => ({
                ...p,
                x: p.x + p.vx,
                y: p.y + p.vy,
                vy: p.vy + 0.05,
                life: Math.max(0, p.life - 16),
              }))
              .filter((p) => p.life > 0)
          : ps
      )
      // 트레일 시간 감소
      if (trail && trail.t > 0) setTrail((t) => (t ? { ...t, t: Math.max(0, t.t - 16) } : t))
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => {
      mounted = false
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [shakeMs, hitstopMs, spark, trail])

  const canUseSkill = useCallback(
    (s: Skill) => {
      if (s.role === 'ATTACK' && selfInjuries.includes('ARM')) return false
      if (s.role === 'DEFENSE' && s.id === 'dodge' && selfInjuries.includes('LEG')) return false
      return !choice
    },
    [selfInjuries, choice]
  )

  return (
    <div className="arena-frame">
      <div className="panel">
        <h3>인게임 전투</h3>
        <ResourceBar />
        <div className="parchment" style={{ marginTop: 8 }}>
          <div className="row" style={{ gap: 24, marginBottom: 12, alignItems: 'center' }}>
            <div>라운드: {round}</div>
            <div>역할: {role === 'ATTACK' ? '공격' : '방어'}</div>
            <div>남은 시간: {timeLeft}s</div>
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <MomentumBar value={momentum} />
              <span style={{ fontSize: 12 }}>기세</span>
            </div>
          </div>
          <div
            style={{
              border: '1px solid #ddd',
              borderRadius: 8,
              overflow: 'hidden',
              width: 480,
              height: 260,
              background: '#f7f1e1',
              position: 'relative',
            }}
          >
            {/* 모래바닥 */}
            <div
              style={{
                position: 'absolute',
                left: cam.x + 0,
                top: cam.y + 180,
                width: 480,
                height: 60,
                background: '#e5d3a1',
              }}
            />
            {/* 적(우상단) */}
            <img
              src="/sprites/fighter_red.svg"
              style={{
                position: 'absolute',
                left: cam.x + 360,
                top: cam.y + 40,
                width: 72,
                height: 72,
              }}
            />
            <div style={{ position: 'absolute', left: cam.x + 360, top: cam.y + 12 }}>
              <Hearts n={oppHp} max={oppMaxHp} />
            </div>
            {/* 나(좌하단) */}
            <img
              src="/sprites/fighter_blue.svg"
              style={{
                position: 'absolute',
                left: cam.x + 80,
                top: cam.y + 140,
                width: 72,
                height: 72,
                transform: 'scaleX(-1)',
              }}
            />
            <div style={{ position: 'absolute', left: cam.x + 80, top: cam.y + 216 }}>
              <Hearts n={selfHp} max={selfMaxHp} />
            </div>
            {/* 간단한 효과 */}
            {choice === 'heavy' && (
              <div
                style={{
                  position: 'absolute',
                  left: cam.x + 150,
                  top: cam.y + 180,
                  width: 50,
                  height: 3,
                  background: '#aa0000',
                  transform: 'rotate(-20deg)',
                }}
              />
            )}
            {choice === 'light' && (
              <div
                style={{
                  position: 'absolute',
                  left: cam.x + 150,
                  top: cam.y + 180,
                  width: 40,
                  height: 3,
                  background: '#aa8800',
                }}
              />
            )}
            {choice === 'block' && (
              <div
                style={{
                  position: 'absolute',
                  left: cam.x + 220,
                  top: cam.y + 160,
                  width: 20,
                  height: 40,
                  background: '#888',
                }}
              />
            )}
            {choice === 'counter' && (
              <img
                src="/sprites/spark.svg"
                style={{
                  position: 'absolute',
                  left: cam.x + 240,
                  top: cam.y + 180,
                  width: 24,
                  height: 24,
                  filter: 'hue-rotate(120deg)',
                }}
              />
            )}
            {spark && spark.t > 0 && (
              <img
                src="/sprites/spark.svg"
                style={{
                  position: 'absolute',
                  left: cam.x + spark.x,
                  top: cam.y + spark.y,
                  width: 14,
                  height: 14,
                  opacity: Math.max(0, spark.t / 200),
                }}
              />
            )}
            {particles.map((p, idx) => (
              <img
                key={idx}
                src="/sprites/spark.svg"
                style={{
                  position: 'absolute',
                  left: cam.x + p.x,
                  top: cam.y + p.y,
                  width: 6,
                  height: 6,
                  opacity: Math.max(0.1, p.life / p.ttl),
                }}
              />
            ))}
            {trail && trail.t > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: cam.x + 150,
                  top: cam.y + 175,
                  width: 60,
                  height: 4,
                  background: '#ffaa66',
                  opacity: Math.max(0, trail.t / trail.ttl),
                }}
              />
            )}
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            {available.map((s) => (
              <SkillButton
                key={s.id}
                id={s.id}
                label={s.name}
                disabled={!canUseSkill(s)}
                onClick={onSelect}
              />
            ))}
          </div>
          <div className="row" style={{ gap: 24, marginTop: 12 }}>
            <div>내 선택: {choice ?? '-'}</div>
            <div>상대 선택: {opponentChoice ?? '-'}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              내 부상: {selfInjuries.join(',') || '-'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              상대 부상: {oppInjuries.join(',') || '-'}
            </div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="ghost-btn" onClick={() => navigate('/result')}>
              항복/종료
            </button>
            <button className="ghost-btn" onClick={() => socket.emit('battle.surrender')}>
              항복(서버)
            </button>
            <button className="gold-btn" onClick={() => navigate('/lobby')}>
              로비로
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            <h4>로그</h4>
            <pre>{log.join('\n')}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}
