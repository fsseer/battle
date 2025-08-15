import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import '../styles/theme.css'
import { useI18n } from '../i18n/useI18n'
import type { Language } from '../i18n/locales'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { lang, setLang, t } = useI18n()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [idErr, setIdErr] = useState<string>('')
  const [pwErr, setPwErr] = useState<string>('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const idValid = id.length >= 4 && id.length <= 24
    const pwValid = password.length >= 4 && password.length <= 24
    setIdErr(idValid ? '' : t('login.error.id'))
    setPwErr(pwValid ? '' : t('login.error.pw'))
    if (!idValid || !pwValid) return
    // TODO: 서버 연동 전까지는 더미 인증 성공 처리
    setUser({ id, name: id })
    navigate('/lobby')
  }

  return (
    <div className="arena-frame">
      <div className="panel">
        <div className="parchment">
          <div className="row" style={{ justifyContent: 'center', marginBottom: 8 }}>
            <img src="/images/helmet.svg" alt="helmet" width={64} height={64} />
          </div>
          <div className="title">{t('login.title')}</div>
          <div className="subtitle text-sm font-body ink-warm">{t('login.subtitle')}</div>
          <div className="lang-switch">
            <label>{t('login.lang')}</label>
            <select value={lang} onChange={(e) => setLang(e.target.value as Language)}>
              <option value="ko">{t('common.lang.ko')}</option>
              <option value="en">{t('common.lang.en')}</option>
              <option value="ja">{t('common.lang.ja')}</option>
            </select>
          </div>
          <form onSubmit={onSubmit} className="grid" style={{ gridTemplateColumns: '1fr' }}>
            <input className={`control${idErr ? ' invalid' : ''}`} placeholder={t('login.id')} value={id} maxLength={24} onChange={(e) => { setId(e.target.value); if (idErr) setIdErr('') }} required />
            {idErr ? <div className="error-text">{idErr}</div> : null}
            <input className={`control${pwErr ? ' invalid' : ''}`} placeholder={t('login.pw')} type="password" value={password} maxLength={24} onChange={(e) => { setPassword(e.target.value); if (pwErr) setPwErr('') }} required />
            {pwErr ? <div className="error-text">{pwErr}</div> : null}
            <div className="actions">
              <button type="submit" className="gold-btn" style={{ width: '100%' }}>{t('login.enter')}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}


