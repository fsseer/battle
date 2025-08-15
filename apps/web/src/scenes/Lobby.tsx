import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import '../styles/theme.css'
import { useI18n } from '../i18n/useI18n'

export default function Lobby() {
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()
  const { t } = useI18n()

  return (
    <div className="arena-frame">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="title">{t('lobby.title')}</div>
          <img src="/images/laurel.svg" alt="laurel" width={48} height={48} />
        </div>
        <div className="subtitle">{t('lobby.subtitle', { name: user?.name ?? 'Guest' })}</div>

        <div className="parchment">
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
          </div>
        </div>

        <div className="row section" style={{ justifyContent: 'space-between' }}>
          <button className="ghost-btn" onClick={() => { clear(); navigate('/login') }}>{t('lobby.logout')}</button>
          <button className="gold-btn" onClick={() => navigate('/match')}>{t('lobby.quick')}</button>
        </div>
      </div>
    </div>
  )
}


