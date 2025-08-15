import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import '../styles/theme.css'
import { useI18n } from '../i18n/useI18n'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { lang, setLang, t } = useI18n()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: 서버 연동 전까지는 더미 인증
    if (id && password) {
      setUser({ id, name: id })
      navigate('/lobby')
    }
  }

  return (
    <div className="arena-frame">
      <div className="panel">
        <div className="parchment">
          <div className="row" style={{ justifyContent: 'center', marginBottom: 8 }}>
            <img src="/images/helmet.svg" alt="helmet" width={64} height={64} />
          </div>
          <div className="title">{t('login.title')}</div>
          <div className="subtitle">{t('login.subtitle')}</div>
          <div className="row" style={{ gap: 8, marginBottom: 8 }}>
            <label style={{ fontSize: 14 }}>{t('login.lang')}</label>
            <select value={lang} onChange={(e) => setLang(e.target.value as any)}>
              <option value="ko">{t('common.lang.ko')}</option>
              <option value="en">{t('common.lang.en')}</option>
              <option value="ja">{t('common.lang.ja')}</option>
            </select>
          </div>
          <form onSubmit={onSubmit} className="grid" style={{ gridTemplateColumns: '1fr' }}>
            <input className="control" placeholder={t('login.id')} value={id} onChange={(e) => setId(e.target.value)} />
            <input className="control" placeholder={t('login.pw')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <div className="actions" style={{ justifyContent: 'space-between' }}>
              <button type="button" className="ghost-btn" onClick={() => { setId('Maximus'); setPassword('test'); }}>{t('login.autofill')}</button>
              <button type="submit" className="gold-btn">{t('login.enter')}</button>
            </div>
          </form>
          <div className="section" style={{ fontSize: 14 }}>{t('login.hint')}</div>
        </div>
      </div>
    </div>
  )
}


