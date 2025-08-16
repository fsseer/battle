import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import '../styles/theme.css'
import { useI18n } from '../i18n/useI18n'
import type { Language } from '../i18n/locales'
import { loginRequest, registerRequest, checkIdAvailability } from '../lib/api'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()
  const { lang, setLang, t } = useI18n()
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [confirm, setConfirm] = useState('')
  const [idErr, setIdErr] = useState<string>('')
  const [pwErr, setPwErr] = useState<string>('')
  const [idHint, setIdHint] = useState<string>('')

  async function handleCheckDuplicate() {
    setIdHint('')
    // basic front validation
    const alnum = (s: string) => /^[A-Za-z0-9]+$/.test(s)
    const idLenOk = id.length >= 4 && id.length <= 24
    const idCsOk = alnum(id)
    if (!idLenOk || !idCsOk) {
      setIdErr(!idCsOk ? t('login.error.charset') : t('login.error.id'))
      return
    }
    try {
      const r = await checkIdAvailability(id)
      if (r.ok && typeof r.available !== 'undefined') {
        setIdHint(r.available ? '사용 가능한 아이디입니다.' : '이미 사용 중입니다.')
        if (!r.available) setIdErr(t('login.error.duplicate'))
        else setIdErr('')
      }
    } catch {
      setIdErr(t('login.error.auth'))
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const alnum = (s: string) => /^[A-Za-z0-9]+$/.test(s)
    const idLenOk = id.length >= 4 && id.length <= 24
    const idCsOk = alnum(id)
    const pwLenOk = password.length >= 4 && password.length <= 24
    const pwCsOk = alnum(password)
    const idValid = idLenOk && idCsOk
    const pwValid = pwLenOk && pwCsOk
    setIdErr(idValid ? '' : !idCsOk ? t('login.error.charset') : t('login.error.id'))
    setPwErr(pwValid ? '' : !pwCsOk ? t('login.error.charset') : t('login.error.pw'))
    if (!idValid || !pwValid) return
    // 서버 인증 연동
    if (mode === 'register') {
      // basic front validation
      if (password !== confirm) {
        setPwErr(t('login.error.confirm'))
        return
      }
      // Always check duplicate on submit
      try {
        const res = await checkIdAvailability(id)
        if (res.ok && res.available === false) {
          setIdErr(t('login.error.duplicate'))
          setIdHint('이미 사용 중입니다.')
          return
        }
      } catch {
        setPwErr(t('login.error.auth'))
        return
      }

      registerRequest(id, password, confirm)
        .then((r) => {
          if (r.ok && r.user && r.token) {
            setUser({
              id: r.user.id,
              name: r.user.name,
              token: r.token,
              characters: r.user.characters,
            })
            navigate('/lobby')
          } else if (r.error === 'DUPLICATE_ID') {
            setIdErr(t('login.error.duplicate'))
          } else if (r.error === 'INVALID_INPUT') {
            // @ts-ignore
            const d = (r as any).errorDetails
            if (d?.idLength || d?.idWhitespace) setIdErr(t('login.error.id'))
            if (d?.pwLength || d?.pwWhitespace) setPwErr(t('login.error.pw'))
            if (d?.mismatch) setPwErr(t('login.error.confirm'))
            if (!d) setPwErr(t('login.error.input'))
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
          setUser({
            id: r.user.id,
            name: r.user.name,
            token: r.token,
            characters: r.user.characters,
          })
          navigate('/lobby')
        } else if (r.error === 'USER_NOT_FOUND') {
          setIdErr(t('login.error.notFound'))
        } else if (r.error === 'WRONG_PASSWORD') {
          setPwErr(t('login.error.wrongPw'))
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
            <div className="row" style={{ gap: 8 }}>
              <input
                className={`control${idErr ? ' invalid' : ''}`}
                id="login-id"
                placeholder={t('login.id')}
                value={id}
                maxLength={24}
                onChange={async (e) => {
                  const v = e.target.value
                  if (/\s/.test(v)) return
                  if (v && !/^[A-Za-z0-9]+$/.test(v)) {
                    setIdErr(t('login.error.charset'))
                    return
                  }
                  setId(v)
                  if (idErr) setIdErr('')
                  setIdHint('')
                }}
                required
              />
              {mode === 'register' && (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={handleCheckDuplicate}
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '0.85rem',
                    padding: '6px 12px',
                    minWidth: 96,
                    flex: '0 0 auto',
                  }}
                >
                  중복 체크
                </button>
              )}
            </div>
            {idErr ? (
              <div className="error-text">{idErr}</div>
            ) : idHint ? (
              <div
                className="text-sm"
                style={{ color: idHint.includes('사용') ? '#2a8f2a' : '#b93838' }}
              >
                {idHint}
              </div>
            ) : null}
            <input
              className={`control${pwErr ? ' invalid' : ''}`}
              id="login-password"
              placeholder={t('login.pw')}
              type="password"
              value={password}
              maxLength={24}
              onChange={(e) => {
                const v = e.target.value
                if (/\s/.test(v)) return
                if (v && !/^[A-Za-z0-9]+$/.test(v)) {
                  setPwErr(t('login.error.charset'))
                  return
                }
                setPassword(v)
                if (mode === 'register' && confirm && v !== confirm)
                  setPwErr(t('login.error.confirm'))
                else setPwErr('')
              }}
              required
            />
            {pwErr ? <div className="error-text">{pwErr}</div> : null}
            {mode === 'register' ? (
              <input
                className={`control${pwErr ? ' invalid' : ''}`}
                id="login-confirm"
                placeholder={t('login.pwConfirm')}
                type="password"
                value={confirm}
                maxLength={24}
                onChange={(e) => {
                  const v = e.target.value
                  if (/\s/.test(v)) return
                  if (v && !/^[A-Za-z0-9]+$/.test(v)) {
                    setPwErr(t('login.error.charset'))
                    return
                  }
                  setConfirm(v)
                  if (password && v !== password) setPwErr(t('login.error.confirm'))
                  else setPwErr('')
                }}
                required
              />
            ) : null}
            <div className="actions">
              <button type="submit" className="gold-btn" style={{ width: '100%' }}>
                {mode === 'login' ? t('login.enter') : '계정 생성'}
              </button>
            </div>
          </form>
          <div className="row" style={{ marginTop: 8, justifyContent: 'flex-end' }}>
            {mode === 'login' ? (
              <button className="ghost-btn" onClick={() => setMode('register')}>
                계정 생성
              </button>
            ) : (
              <button className="ghost-btn" onClick={() => setMode('login')}>
                로그인으로
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
