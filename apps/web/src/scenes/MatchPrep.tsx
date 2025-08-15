import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { socket } from '../lib/socket.ts'
import { useAuthStore } from '../store/auth'
import ResourceBar from '../components/ResourceBar'

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
  useEffect(() => {
    let mounted = true
    fetch('http://127.0.0.1:5174/training/catalog')
      .then(r=>r.ok?r.json():null)
      .then(j=>{ if (mounted && j?.ok) setCatalog(j.items) })
      .catch(()=>{})
    return () => { mounted = false }
  }, [])
  // 훈련 실행 VFX(간단한 메시지 플래시)
  const [flash, setFlash] = useState<string>('')
  const flashTimer = useRef<number | null>(null)
  async function call(path: string, payload: any) {
    if (!token) return
    setBusy(true)
    try {
      const r = await fetch(`http://127.0.0.1:5174${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload) })
      const j = await r.json().catch(()=>null)
      if (j?.ok) {
        setFlash('훈련 완료!')
        if (flashTimer.current) window.clearTimeout(flashTimer.current)
        flashTimer.current = window.setTimeout(() => setFlash(''), 900)
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
          {flash ? <div className="row" style={{ justifyContent: 'center', marginBottom: 8 }}><span style={{ color: '#2a8f2a' }}>{flash}</span></div> : null}
          <ResourceBar />
          <div className="column" style={{ gap: 10, marginTop: 8 }}>
            <div className="column" style={{ gap: 6 }}>
              <SectionHeader title="기초 훈련" open={basicOpen} onToggle={() => setBasicOpen(v => !v)} />
              {basicOpen && (
                <div className="column" style={{ gap: 6, paddingLeft: 8 }}>
                  <SubHeader title="힘 훈련" open={strOpen} onToggle={() => setStrOpen(v=>!v)} />
                  {strOpen && catalog.filter((x:any)=>x.id.startsWith('basic.str.')).map((it:any)=> (
                    <Row key={it.id} it={it} busy={busy} run={(id:string)=>call('/training/run',{id})} />
                  ))}
                  <SubHeader title="민첩 훈련" open={agiOpen} onToggle={() => setAgiOpen(v=>!v)} />
                  {agiOpen && catalog.filter((x:any)=>x.id.startsWith('basic.agi.')).map((it:any)=> (
                    <Row key={it.id} it={it} busy={busy} run={(id:string)=>call('/training/run',{id})} />
                  ))}
                  <SubHeader title="지능 훈련" open={intOpen} onToggle={() => setIntOpen(v=>!v)} />
                  {intOpen && catalog.filter((x:any)=>x.id.startsWith('basic.int.')).map((it:any)=> (
                    <Row key={it.id} it={it} busy={busy} run={(id:string)=>call('/training/run',{id})} />
                  ))}
                </div>
              )}
            </div>

            <div className="column" style={{ gap: 6 }}>
              <SectionHeader title="무기술 훈련" open={weaponOpen} onToggle={() => setWeaponOpen(v => !v)} />
              {weaponOpen && (
                <div className="column" style={{ gap: 6, paddingLeft: 8 }}>
                  <SubHeader title="한손검 훈련" open={oneOpen} onToggle={() => setOneOpen(v=>!v)} />
                  {oneOpen && catalog.filter((x:any)=>x.id.startsWith('weapon.one_hand.')).map((it:any)=> (
                    <Row key={it.id} it={it} busy={busy} run={(id:string)=>call('/training/run',{id})} />
                  ))}
                  <SubHeader title="양손검 훈련" open={twoOpen} onToggle={() => setTwoOpen(v=>!v)} />
                  {twoOpen && catalog.filter((x:any)=>x.id.startsWith('weapon.two_hand.')).map((it:any)=> (
                    <Row key={it.id} it={it} busy={busy} run={(id:string)=>call('/training/run',{id})} />
                  ))}
                  <SubHeader title="쌍검 훈련" open={dualOpen} onToggle={() => setDualOpen(v=>!v)} />
                  {dualOpen && catalog.filter((x:any)=>x.id.startsWith('weapon.dual.')).map((it:any)=> (
                    <Row key={it.id} it={it} busy={busy} run={(id:string)=>call('/training/run',{id})} />
                  ))}
                </div>
              )}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="ghost-btn" disabled={busy} onClick={() => call('/train/earn', { apCost: 5, gold: 10 })}>[훈련] AP-5 → Gold+10</button>
              <button className="ghost-btn" disabled={busy} onClick={() => call('/train/rest', { apCost: 2, stressRelief: 5 })}>[휴식] AP-2 → Stress-5</button>
            </div>
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

function Row({ it, busy, run }: { it: any; busy: boolean; run: (id: string) => void }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
      <div>
        <div style={{ fontWeight: 600 }}>{it.name} {it.goldCost? `(Gold-${it.goldCost})`:''}</div>
        {it.description ? <div className="text-sm" style={{ opacity: .9 }}>{it.description}</div> : null}
      </div>
      <button className="ghost-btn" disabled={busy} onClick={() => run(it.id)}>
        실행 (AP-{it.apCost}, Stress{it.stressDelta>=0?'+':''}{it.stressDelta})
      </button>
    </div>
  )
}

function SectionHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', cursor: 'pointer' }} onClick={onToggle}>
      <div style={{ fontWeight: 700 }}>{title}</div>
      <div>{open ? '▼' : '▶'}</div>
    </div>
  )
}

function SubHeader({ title, open, onToggle }: { title: string; open: boolean; onToggle: () => void }) {
  return (
    <div className="row" style={{ justifyContent: 'space-between', cursor: 'pointer', paddingLeft: 2 }} onClick={onToggle}>
      <div style={{ fontWeight: 600, opacity: .9 }}>{title}</div>
      <div style={{ opacity: .8 }}>{open ? '▾' : '▸'}</div>
    </div>
  )
}


