import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket.ts'
import { useAuthStore } from '../store/auth'

export default function MatchPrep() {
  const navigate = useNavigate()
  const { user, setUser } = useAuthStore()
  const token = (user as any)?.token
  const [busy, setBusy] = useState(false)
  async function call(path: string, payload: any) {
    if (!token) return
    setBusy(true)
    try {
      const r = await fetch(`http://127.0.0.1:5174${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      const j = await r.json().catch(()=>null)
      if (j?.ok) {
        const m = await fetch('http://127.0.0.1:5174/me', { headers: { Authorization: `Bearer ${token}` } }).then(res=>res.json()).catch(()=>null)
        if (m?.ok) setUser({ id: m.user.id, name: m.user.name, token, characters: m.user.characters })
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

  return (
    <div className="arena-frame">
      <div className="panel">
        <h3>대전 준비</h3>
        <div className="parchment" style={{ marginTop: 8, marginBottom: 8 }}>
          <div className="row" style={{ justifyContent: 'flex-end', gap: 16 }}>
            <span className="text-sm">AP: <b>{(user as any)?.characters?.[0]?.ap ?? '—'}</b>/100</span>
            <span className="text-sm">Gold: <b>{(user as any)?.characters?.[0]?.gold ?? 0}</b></span>
            <span className="text-sm">Stress: <b>{(user as any)?.characters?.[0]?.stress ?? 0}</b></span>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="ghost-btn" disabled={busy} onClick={() => call('/train/earn', { apCost: 5, gold: 10 })}>[훈련] AP-5 → Gold+10</button>
            <button className="ghost-btn" disabled={busy} onClick={() => call('/train/rest', { apCost: 2, stressRelief: 5 })}>[휴식] AP-2 → Stress-5</button>
          </div>
        </div>
        <div className="parchment">
          <p>간단한 설명: 여기에서 장비/스킬 선택(추후 확장)</p>
          <div className="row" style={{ gap: 8 }}>
            <button className="ghost-btn" onClick={() => navigate('/lobby')}>뒤로</button>
            <button className="gold-btn" onClick={() => socket.emit('queue.join')}>매칭 시작</button>
          </div>
        </div>
      </div>
    </div>
  )
}


