import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket.ts'
import { Stage, Sprite, Graphics } from '@pixi/react'
import * as PIXI from 'pixi.js'
import ResourceBar from '../components/ResourceBar'
import { loadAssets } from '../lib/assets'

type Role = 'ATTACK' | 'DEFENSE'
type Skill = { id: string, name: string, role: Role | 'ANY' }

const SKILLS: Skill[] = [
  { id: 'slash', name: '베기', role: 'ATTACK' },
  { id: 'feint', name: '견제', role: 'ATTACK' },
  { id: 'block', name: '가드', role: 'DEFENSE' },
  { id: 'parry', name: '패링', role: 'DEFENSE' },
]

export default function Battle() {
  const navigate = useNavigate()
  const [round, setRound] = useState(1)
  const [role, setRole] = useState<Role>('ATTACK')
  const [choice, setChoice] = useState<string | null>(null)
  const [opponentChoice, setOpponentChoice] = useState<string | null>(null)
  const [log, setLog] = useState<string[]>([])
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

  const available = useMemo(() => SKILLS.filter(s => s.role === 'ANY' || s.role === role), [role])

  useEffect(() => {
    // 서버 연결 이벤트
    const onHello = (m: { id: string }) => setLog(l => [`서버 연결: ${m.id}`, ...l])
    const onFound = (m: unknown) => setLog(l => [`매칭: ${JSON.stringify(m)}`, ...l])
    socket.on('server.hello', onHello)
    socket.on('match.found', onFound)
    return () => { socket.off('server.hello', onHello); socket.off('match.found', onFound) }
  }, [])

  useEffect(() => {
    loadAssets().catch(() => {})
    // 라운드 타이머
    if (timerRef.current) window.clearInterval(timerRef.current)
    setTimeLeft(10)
    timerRef.current = window.setInterval(() => {
      setTimeLeft(t => {
        if (hitstopMs > 0) return t // 히트스톱 중엔 시간 멈춤
        if (t <= 1) {
          window.clearInterval(timerRef.current!)
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [round, hitstopMs])

  const resolveRound = useCallback((self: string, opp: string) => {
    // 더미 상성 규칙: 베기>패링, 견제>가드, 가드>베기, 패링>견제, 동일=무승부
    const beats: Record<string, string> = { slash: 'parry', feint: 'block', block: 'slash', parry: 'feint' }
    let result = '무승부'
    if (beats[self] === opp) result = '라운드 승'
    else if (beats[opp] === self) result = '라운드 패'
    setLog(l => [`[R${round}] 나:${self} vs 상대:${opp} → ${result}`, ...l])
    if (result === '라운드 승') setRole('ATTACK')
    else if (result === '라운드 패') setRole('DEFENSE')
    setRound(r => r + 1)
    setChoice(null)
    setOpponentChoice(null)
  }, [round])

  const onSelect = (id: string) => {
    setChoice(id)
    // 스윙 트레일 시작
    setTrail({ id, t: 160, ttl: 160 })
    // 서버에 선택 전송
    socket.emit('battle.choose', id)
  }

  useEffect(() => {
    const onResolved = (m: { round: number; self: string; opp: string; result: 'WIN'|'LOSE'|'DRAW'; nextRole: Role }) => {
      setOpponentChoice(m.opp)
      // 히트스톱 & 카메라 흔들림 트리거
      setHitstopMs(120)
      setShakeMs(200)
      // 간단한 스파크 VFX
      setSpark({ x: 200, y: 110, t: 200 })
      // 파티클 스폰
      setParticles(prev => {
        const burst: Particle[] = []
        for (let i = 0; i < 12; i++) {
          const ang = Math.random() * Math.PI * 2
          const spd = 1 + Math.random() * 2
          burst.push({ x: 200, y: 110, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 0.5, life: 300, ttl: 300 })
        }
        return [...prev, ...burst]
      })
      resolveRound(m.self, m.opp)
      setRole(m.nextRole)
    }
    socket.on('battle.resolve', onResolved)
    return () => { socket.off('battle.resolve', onResolved) }
  }, [resolveRound])

  // 프레임 루프: 히트스톱/카메라 쉐이크 처리
  useEffect(() => {
    let mounted = true
    function loop() {
      if (!mounted) return
      if (shakeMs > 0) {
        const mag = 4
        setCam({ x: (Math.random() - 0.5) * mag, y: (Math.random() - 0.5) * mag })
        setShakeMs(ms => Math.max(0, ms - 16))
      } else {
        setCam({ x: 0, y: 0 })
      }
      if (hitstopMs > 0) setHitstopMs(ms => Math.max(0, ms - 16))
      if (spark && spark.t > 0) setSpark(s => s ? ({ ...s, t: Math.max(0, s.t - 16) }) : s)
      // 파티클 물리 업데이트
      setParticles(ps => ps.length ? ps.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.05,
        life: Math.max(0, p.life - 16)
      })).filter(p => p.life > 0) : ps)
      // 트레일 시간 감소
      if (trail && trail.t > 0) setTrail(t => t ? ({ ...t, t: Math.max(0, t.t - 16) }) : t)
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => { mounted = false; if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [shakeMs, hitstopMs, spark, trail])

  return (
    <div className="arena-frame">
      <div className="panel">
        <h3>인게임 전투</h3>
        <ResourceBar />
        <div className="parchment" style={{ marginTop: 8 }}>
          <div className="row" style={{ gap: 24, marginBottom: 12 }}>
            <div>라운드: {round}</div>
            <div>역할: {role === 'ATTACK' ? '공격' : '방어'}</div>
            <div>남은 시간: {timeLeft}s</div>
          </div>
          <div style={{ border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
            <Stage width={360} height={200} options={{ background: 0xf7f1e1 }}>
                {/* 배경 */}
                <Graphics
                  x={cam.x}
                  y={cam.y}
                  draw={g => {
                    g.clear()
                    g.beginFill(0xe5d3a1)
                    g.drawRect(0, 150, 360, 50) // 모래바닥
                    g.endFill()
                  }}
                />
                {/* 좌/우 캐릭터 임시 스프라이트 */}
                <Sprite image={'/sprites/fighter_red.svg'} x={64 + cam.x} y={88 + cam.y} width={64} height={64} anchor={0} />
                <Sprite image={'/sprites/fighter_blue.svg'} x={260 + cam.x} y={88 + cam.y} width={64} height={64} anchor={0} />
                {/* 간단한 타격/가드 표시 */}
                {choice === 'slash' && (
                  <Graphics x={120 + cam.x} y={110 + cam.y} draw={g => { g.clear(); g.lineStyle(3, 0xaa0000); g.moveTo(0,0); g.lineTo(50,-20) }} />
                )}
                {choice === 'feint' && (
                  <Graphics x={120 + cam.x} y={110 + cam.y} draw={g => { g.clear(); g.lineStyle(3, 0xaa8800); g.moveTo(0,0); g.lineTo(40,0) }} />
                )}
                {choice === 'block' && (
                  <Graphics x={240 + cam.x} y={110 + cam.y} draw={g => { g.clear(); g.beginFill(0x888888); g.drawRect(-10,-20,20,40); g.endFill() }} />
                )}
                {choice === 'parry' && (
                  <Graphics x={240 + cam.x} y={110 + cam.y} draw={g => { g.clear(); g.lineStyle(3, 0x00aa88); g.drawCircle(0,0,12) }} />
                )}
                {/* 스파크 파티클 */}
                {spark && spark.t > 0 && (
                  <Graphics x={spark.x + cam.x} y={spark.y + cam.y} alpha={Math.max(0, spark.t / 200)} draw={g => { g.clear(); g.beginFill(0xffdd66); g.drawCircle(0,0,6); g.endFill() }} />
                )}
                {/* 파티클 */}
                {particles.map((p, idx) => (
                  <Graphics key={idx} x={p.x + cam.x} y={p.y + cam.y} alpha={Math.max(0.1, p.life / p.ttl)} draw={g => { g.clear(); g.beginFill(0xffd27a); g.drawCircle(0,0,2); g.endFill() }} />
                ))}
                {/* 스윙 트레일 */}
                {trail && trail.t > 0 && (
                  <Graphics x={cam.x} y={cam.y} draw={g => {
                    g.clear()
                    const a = trail.t / trail.ttl // 0..1
                    g.lineStyle(6 * a, 0xffaa66, a)
                    if (trail.id === 'slash') {
                      g.moveTo(110, 95)
                      g.quadraticCurveTo(150, 70, 180, 90)
                    } else if (trail.id === 'feint') {
                      g.moveTo(110, 110)
                      g.lineTo(160, 110)
                    } else {
                      // 방어류는 짧은 임팩트 라인
                      g.moveTo(230, 100)
                      g.lineTo(240, 90)
                    }
                  }} />
                )}
              </Container>
            </Stage>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            {available.map(s => (
              <button key={s.id} onClick={() => onSelect(s.id)} disabled={!!choice}>{s.name}</button>
            ))}
          </div>
          <div className="row" style={{ gap: 24, marginTop: 12 }}>
            <div>내 선택: {choice ?? '-'}</div>
            <div>상대 선택: {opponentChoice ?? '-'}</div>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <button className="ghost-btn" onClick={() => navigate('/result')}>항복/종료</button>
            <button className="gold-btn" onClick={() => navigate('/lobby')}>로비로</button>
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


