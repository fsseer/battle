import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket.ts'

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

  const available = useMemo(() => SKILLS.filter(s => s.role === 'ANY' || s.role === role), [role])

  useEffect(() => {
    // 서버 연결 이벤트
    const onHello = (m: any) => setLog(l => [`서버 연결: ${m.id}`, ...l])
    const onFound = (m: any) => setLog(l => [`매칭: ${JSON.stringify(m)}`, ...l])
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
        if (t <= 1) {
          window.clearInterval(timerRef.current!)
        }
        return t - 1
      })
    }, 1000)
    return () => { if (timerRef.current) window.clearInterval(timerRef.current) }
  }, [round])

  const resolveRound = (self: string, opp: string) => {
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
  }

  const onSelect = (id: string) => {
    setChoice(id)
    // 서버에 선택 전송
    socket.emit('battle.choose', id)
  }

  useEffect(() => {
    const onResolved = (m: { round: number; self: string; opp: string; result: 'WIN'|'LOSE'|'DRAW'; nextRole: Role }) => {
      setOpponentChoice(m.opp)
      resolveRound(m.self, m.opp)
      setRole(m.nextRole)
    }
    socket.on('battle.resolve', onResolved)
    return () => { socket.off('battle.resolve', onResolved) }
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h2>인게임 전투</h2>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
        <div>라운드: {round}</div>
        <div>역할: {role === 'ATTACK' ? '공격' : '방어'}</div>
        <div>남은 시간: {timeLeft}s</div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {available.map(s => (
          <button key={s.id} onClick={() => onSelect(s.id)} disabled={!!choice}>{s.name}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 24, marginBottom: 12 }}>
        <div>내 선택: {choice ?? '-'}</div>
        <div>상대 선택: {opponentChoice ?? '-'}</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => navigate('/result')}>항복/종료</button>
        <button onClick={() => navigate('/lobby')}>로비로</button>
      </div>
      <div style={{ marginTop: 16 }}>
        <h4>로그</h4>
        <pre>{log.join('\n')}</pre>
      </div>
    </div>
  )
}


