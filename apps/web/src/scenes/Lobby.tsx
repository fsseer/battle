import { useNavigate } from 'react-router-dom'
import { SERVER_ORIGIN } from '../lib/api'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/auth'
import '../styles/theme.css'
import { useI18n } from '../i18n/useI18n'
import ResourceBar from '../components/ResourceBar'

export default function Lobby() {
  const navigate = useNavigate()
  const { user, clear, setUser } = useAuthStore()
  const { t } = useI18n()
  const pollingRef = useRef<number | null>(null)

  useEffect(() => {
    const token = (user as any)?.token
    if (!token) return
    fetch(`${SERVER_ORIGIN}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (m?.ok) {
          setUser({ id: m.user.id, name: m.user.name, token, characters: m.user.characters })
        }
      })
      .catch(() => {})
  }, [])

  // AP 자동 반영: 주기적으로 /me 폴링
  useEffect(() => {
    const token = (user as any)?.token
    if (!token) return
    if (pollingRef.current) window.clearInterval(pollingRef.current)
    const id = window.setInterval(() => {
      fetch(`${SERVER_ORIGIN}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((m) => {
          if (m?.ok)
            setUser({ id: m.user.id, name: m.user.name, token, characters: m.user.characters })
        })
        .catch(() => {})
    }, 3000) // dev: 3s; prod: can be increased
    pollingRef.current = id
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current)
    }
  }, [(user as any)?.token])

  return (
    <div className="arena-frame">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="title">{t('lobby.title')}</div>
          <img src="/images/laurel.svg" alt="laurel" width={48} height={48} />
        </div>
        <div className="subtitle">{t('lobby.subtitle', { name: user?.name ?? 'Guest' })}</div>

        <div className="parchment">
          <ResourceBar />
          <div className="grid">
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('lobby.training.title')}</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>{t('lobby.training.desc')}</div>
              <div className="section">
                <button className="ghost-btn" onClick={() => navigate('/training')}>
                  {t('lobby.training.start')}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('lobby.arena.title')}</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>{t('lobby.arena.desc')}</div>
              <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                <img src="/images/colosseum.svg" alt="colosseum" width={72} height={48} />
                <button className="gold-btn" onClick={() => navigate('/match')}>
                  {t('lobby.arena.queue')}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('lobby.barracks.title')}</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>{t('lobby.barracks.desc')}</div>
              <div className="section">
                <button className="ghost-btn" onClick={() => alert('WIP')}>
                  {t('lobby.barracks.maint')}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>스킬 / 특성</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                현재 장비/숙련/능력치에 따라 사용 가능 여부가 달라집니다.
              </div>
              <div className="section">
                <button className="ghost-btn" onClick={() => navigate('/skills')}>
                  스킬/특성 보기
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="actions section" style={{ justifyContent: 'space-between' }}>
          <button
            className="ghost-btn"
            onClick={() => {
              clear()
              navigate('/login')
            }}
          >
            {t('lobby.logout')}
          </button>
          <button className="gold-btn" onClick={() => navigate('/match')}>
            {t('lobby.quick')}
          </button>
        </div>
      </div>
    </div>
  )
}
