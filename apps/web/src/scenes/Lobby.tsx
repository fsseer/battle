import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '../store/auth'
import '../styles/theme.css'
import { useI18n } from '../i18n/useI18n'

export default function Lobby() {
  const navigate = useNavigate()
  const { user, clear, setUser } = useAuthStore()
  const { t } = useI18n()

  useEffect(() => {
    const token = (user as any)?.token
    if (!token) return
    fetch('http://127.0.0.1:5174/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then((m) => {
        if (m?.ok) {
          setUser({ id: m.user.id, name: m.user.name, token, characters: m.user.characters })
        }
      })
      .catch(() => {})
  }, [])

  return (
    <div className="arena-frame">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="title">{t('lobby.title')}</div>
          <img src="/images/laurel.svg" alt="laurel" width={48} height={48} />
        </div>
        <div className="subtitle">{t('lobby.subtitle', { name: user?.name ?? 'Guest' })}</div>

        <div className="parchment">
          <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8, gap: 16 }}>
            <span className="text-sm" style={{ opacity: .9 }}>AP: <b>{(user as any)?.characters?.[0]?.ap ?? '—'}</b>/100</span>
            <span className="text-sm" style={{ opacity: .9 }}>Gold: <b>{(user as any)?.characters?.[0]?.gold ?? 0}</b></span>
            <span className="text-sm" style={{ opacity: .9 }}>Stress: <b>{(user as any)?.characters?.[0]?.stress ?? 0}</b></span>
          </div>
          <div className="grid">
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('lobby.training.title')}</div>
              <div style={{ fontSize: 14, opacity: .9 }}>{t('lobby.training.desc')}</div>
              <div className="section"><button className="ghost-btn" onClick={() => navigate('/match')}>{t('lobby.training.start')}</button></div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('lobby.arena.title')}</div>
              <div style={{ fontSize: 14, opacity: .9 }}>{t('lobby.arena.desc')}</div>
              <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                <img src="/images/colosseum.svg" alt="colosseum" width={72} height={48} />
                <button className="gold-btn" onClick={() => navigate('/match')}>{t('lobby.arena.queue')}</button>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('lobby.barracks.title')}</div>
              <div style={{ fontSize: 14, opacity: .9 }}>{t('lobby.barracks.desc')}</div>
              <div className="section"><button className="ghost-btn" onClick={() => alert('WIP')}>{t('lobby.barracks.maint')}</button></div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>스킬 / 특성</div>
              <div style={{ fontSize: 14, opacity: .9 }}>현재 장비/숙련/능력치에 따라 사용 가능 여부가 달라집니다.</div>
              <div className="section"><button className="ghost-btn" onClick={() => navigate('/skills')}>스킬/특성 보기</button></div>
            </div>
          </div>
        </div>

        <div className="actions section" style={{ justifyContent: 'space-between' }}>
          <button className="ghost-btn" onClick={() => { clear(); navigate('/login') }}>{t('lobby.logout')}</button>
          <button className="gold-btn" onClick={() => navigate('/match')}>{t('lobby.quick')}</button>
        </div>
      </div>
    </div>
  )
}


