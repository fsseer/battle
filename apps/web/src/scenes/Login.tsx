import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import '../styles/theme.css'
import { useI18n } from '../i18n/useI18n'
import type { Language } from '../i18n/locales'
import { loginRequest, registerRequest } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { lang, setLang, t } = useI18n()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login'|'register'>('login')
  const [confirm, setConfirm] = useState('')
  const [idErr, setIdErr] = useState<string>('')
  const [pwErr, setPwErr] = useState<string>('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const idValid = id.length >= 4 && id.length <= 24
    const pwValid = password.length >= 4 && password.length <= 24
    setIdErr(idValid ? '' : t('login.error.id'))
    setPwErr(pwValid ? '' : t('login.error.pw'))
    if (!idValid || !pwValid) return
    // 서버 인증 연동
    if (mode === 'register') {
      // basic front validation
      if (password !== confirm) { setPwErr(t('login.error.pw')); return }
      registerRequest(id, password, confirm)
        .then((r) => {
          if (r.ok && r.user && r.token) {
            setUser({ id: r.user.id, name: r.user.name, token: r.token, characters: r.user.characters })
            navigate('/lobby')
          } else if (r.error === 'DUPLICATE_ID') {
            setIdErr(t('login.error.id'))
          } else {
            setPwErr(t('login.error.auth'))
          }
        })
        .catch(() => setPwErr(t('login.error.auth')))
      return
    }
    loginRequest(id, password)
      .then((r) => {
        if (r.ok && r.user && r.token) {
          setUser({ id: r.user.id, name: r.user.name, token: r.token, characters: r.user.characters })
          navigate('/lobby')
        } else if (r.error === 'USER_NOT_FOUND') {
          setIdErr(t('login.error.id'))
        } else if (r.error === 'WRONG_PASSWORD') {
          setPwErr(t('login.error.pw'))
        } else {
          setPwErr(t('login.error.auth'))
        }
      })
      .catch(() => setPwErr(t('login.error.auth')))
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
            <input className={`control${idErr ? ' invalid' : ''}`} placeholder={t('login.id')} value={id} maxLength={24} onChange={(e) => { const v = e.target.value; if (/\s/.test(v)) return; setId(v); if (idErr) setIdErr('') }} required />
            {idErr ? <div className="error-text">{idErr}</div> : null}
            <input className={`control${pwErr ? ' invalid' : ''}`} placeholder={t('login.pw')} type="password" value={password} maxLength={24} onChange={(e) => { const v = e.target.value; if (/\s/.test(v)) return; setPassword(v); if (pwErr) setPwErr('') }} required />
            {pwErr ? <div className="error-text">{pwErr}</div> : null}
            {mode === 'register' ? (
              <input className={`control${pwErr ? ' invalid' : ''}`} placeholder={t('login.pwConfirm')} type="password" value={confirm} maxLength={24} onChange={(e) => { const v = e.target.value; if (/\s/.test(v)) return; setConfirm(v) }} required />
            ) : null}
            <div className="actions">
              <button type="submit" className="gold-btn" style={{ width: '100%' }}>
                {mode === 'login' ? t('login.enter') : '계정 생성'}
              </button>
            </div>
          </form>
          <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
            {mode === 'login' ? (
              <button className="ghost-btn" onClick={() => setMode('register')}>계정 생성</button>
            ) : (
              <button className="ghost-btn" onClick={() => setMode('login')}>로그인으로</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


