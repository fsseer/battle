import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket.ts'
import { Stage, Container, Sprite, Graphics } from '@pixi/react'
import * as PIXI from 'pixi.js'
import ResourceBar from '../components/ResourceBar'

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
    // 서버에 선택 전송
    socket.emit('battle.choose', id)
  }

  useEffect(() => {
    const onResolved = (m: { round: number; self: string; opp: string; result: 'WIN'|'LOSE'|'DRAW'; nextRole: Role }) => {
      setOpponentChoice(m.opp)
      // 히트스톱 & 카메라 흔들림 트리거
      setHitstopMs(120)
      setShakeMs(200)
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
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)
    return () => { mounted = false; if (frameRef.current) cancelAnimationFrame(frameRef.current) }
  }, [shakeMs, hitstopMs])

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
              <Container x={cam.x} y={cam.y}>
                {/* 배경 */}
                <Graphics
                  draw={g => {
                    g.clear()
                    g.beginFill(0xe5d3a1)
                    g.drawRect(0, 150, 360, 50) // 모래바닥
                    g.endFill()
                  }}
                />
                {/* 좌/우 캐릭터 더미 */}
                <Graphics
                  x={80}
                  y={120}
                  draw={g => {
                    g.clear()
                    g.beginFill(0x6b4f2a)
                    g.drawCircle(0, 0, 16) // 머리
                    g.endFill()
                    g.lineStyle(4, 0x6b4f2a)
                    g.moveTo(0, 0)
                    g.lineTo(0, 30) // 몸통
                  }}
                />
                <Graphics
                  x={280}
                  y={120}
                  draw={g => {
                    g.clear()
                    g.beginFill(0x2a4f6b)
                    g.drawCircle(0, 0, 16)
                    g.endFill()
                    g.lineStyle(4, 0x2a4f6b)
                    g.moveTo(0, 0)
                    g.lineTo(0, 30)
                  }}
                />
                {/* 간단한 타격/가드 표시 */}
                {choice === 'slash' && (
                  <Graphics x={120} y={110} draw={g => { g.clear(); g.lineStyle(3, 0xaa0000); g.moveTo(0,0); g.lineTo(50,-20) }} />
                )}
                {choice === 'feint' && (
                  <Graphics x={120} y={110} draw={g => { g.clear(); g.lineStyle(3, 0xaa8800); g.moveTo(0,0); g.lineTo(40,0) }} />
                )}
                {choice === 'block' && (
                  <Graphics x={240} y={110} draw={g => { g.clear(); g.beginFill(0x888888); g.drawRect(-10,-20,20,40); g.endFill() }} />
                )}
                {choice === 'parry' && (
                  <Graphics x={240} y={110} draw={g => { g.clear(); g.lineStyle(3, 0x00aa88); g.drawCircle(0,0,12) }} />
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


