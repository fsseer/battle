import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

type SkillState = 'usable'|'locked_prof'|'locked_stat'|'locked_item'

export default function Skills() {
  const [data, setData] = useState<any>({ weaponSkills: [], characterSkills: [], traits: [] })
  const [me, setMe] = useState<any>(null)
  const navigate = useNavigate()
  const load = async () => {
    try {
      const [skillsRes, meRes] = await Promise.all([
        fetch('http://127.0.0.1:5174/skills', { headers: authHeader() }),
        fetch('http://127.0.0.1:5174/me', { headers: authHeader() })
      ])
      // 세션 만료 또는 유저 없음 → 자동 로그아웃 후 로그인으로 이동
      if (meRes.status === 401 || meRes.status === 404) {
        try { localStorage.removeItem('auth') } catch {}
        alert('세션이 만료되었습니다. 다시 로그인해 주세요.')
        navigate('/login')
        return
      }
      const s = await skillsRes.json()
      const m = await meRes.json()
      setData(s)
      if (m?.ok) setMe(m.user)
    } catch {}
  }
  useEffect(() => { load() }, [])

  const renderSkill = (s: any) => (
    <div key={s.skill.id} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8, marginBottom: 8, opacity: s.state === 'usable' ? 1 : .6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div><b>{s.skill.name}</b> <small>({s.skill.category})</small></div>
        <StateBadge state={s.state} />
      </div>
      {s.missing?.prof ? <div style={{ fontSize: 12 }}>요구 숙련: {s.missing.prof.kind} Lv{s.missing.prof.need} (현재 {s.missing.prof.have})</div> : null}
      {s.missing?.stats ? <div style={{ fontSize: 12 }}>요구 능력치: {s.missing.stats.map((x:any)=>`${x.key}:${x.need}(현재 ${x.have})`).join(', ')}</div> : null}
      {s.missing?.itemId ? <div style={{ fontSize: 12 }}>전용 아이템 필요</div> : null}
    </div>
  )

  return (
    <div className="arena-frame">
      <div className="panel">
        <h3>스킬 / 특성</h3>
        <div className="parchment" style={{ marginTop: 8 }}>
          {me ? (
            <div style={{ marginBottom: 8, fontSize: 12 }}>
              <b>숙련도</b>: {me.characters?.[0]?.proficiencies?.map((p:any)=>`${p.kind}:Lv${p.level}(xp:${p.xp})`).join(' / ') || '없음'}
            </div>
          ) : null}
          <h4>무기 스킬</h4>
          <div>{data.weaponSkills.map(renderSkill)}</div>
          <h4>캐릭터 스킬</h4>
          <div>{data.characterSkills.map(renderSkill)}</div>
          <h4>특성</h4>
          <div>
            {data.traits.map((t:any)=>(
              <div key={t.trait.id} style={{ padding: 8, border: '1px solid #ddd', borderRadius: 8, marginBottom: 8, opacity: t.unlocked?1:.6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <div><b>{t.trait.name}</b></div>
                  <span style={{ fontSize: 12 }}>{t.unlocked? 'UNLOCKED':'LOCKED'}</span>
                </div>
                <div style={{ fontSize: 12 }}>{t.trait.description ?? ''}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="section" style={{ display: 'flex', gap: 8 }}>
          <button className="ghost-btn" onClick={() => trainOneHand().then(load)}>한손 무기 훈련(+100xp)</button>
        </div>
      </div>
    </div>
  )
}

function StateBadge({ state }: { state: SkillState }) {
  const color = state==='usable' ? '#2a8f2a' : state==='locked_prof' ? '#b96f00' : state==='locked_stat' ? '#b93838' : '#555'
  const text = state==='usable' ? 'USABLE' : state==='locked_prof' ? 'PROFICIENCY' : state==='locked_stat' ? 'STATS' : 'EQUIP/ITEM'
  return <span style={{ fontSize: 12, color }}>{text}</span>
}

function authHeader() {
  try {
    const raw = localStorage.getItem('auth')
    if (!raw) return {}
    const token = JSON.parse(raw)?.user?.token
    if (!token) return {}
    return { Authorization: `Bearer ${token}` }
  } catch { return {} }
}

async function trainOneHand() {
  try {
    await fetch('http://127.0.0.1:5174/train/proficiency', { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader() as any }, body: JSON.stringify({ kind: 'ONE_HAND', xp: 100 }) })
  } catch {}
}


