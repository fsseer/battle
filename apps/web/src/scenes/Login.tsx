import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { socket } from '../lib/socket'
import '../styles/theme.css'
import { loginRequest, registerRequest, checkIdAvailability } from '../lib/api'
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'

export default function Login() {
  const navigate = useNavigate()
  const { setUser } = useAuthStore()

  // 가로형 레이아웃 상태 및 최적화 훅 사용
  const { canDisplayGame } = useLandscapeLayout()

  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [confirm, setConfirm] = useState('')
  const [idErr, setIdErr] = useState<string>('')
  const [pwErr, setPwErr] = useState<string>('')
  const [idHint, setIdHint] = useState<string>('')
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState(false)
  const [showDuplicateLoginModal, setShowDuplicateLoginModal] = useState(false)
  const [duplicateLoginInfo, setDuplicateLoginInfo] = useState<{
    user: {
      id: string
      name: string
      nickname?: string
      characters?: Array<{
        id: string
        name: string
        level: number
        stats: { str: number; agi: number; sta: number }
      }>
    }
    token: string
    existingSessionInfo?: {
      lastActivity: number
      message: string
    }
  } | null>(null)

  // 소켓 연결 상태 확인
  useEffect(() => {
    // 초기 상태 설정
    // setSocketStatus(socket.connected ? 'connected' : 'disconnected') // Removed

    const handleConnect = () => {
      console.log('[Login] 소켓 연결됨')
      // setSocketStatus('connected') // Removed
    }

    const handleDisconnect = () => {
      console.log('[Login] 소켓 연결 해제됨')
      // setSocketStatus('disconnected') // Removed
    }

    const handleAuthSuccess = (data: { userId: string }) => {
      console.log('[Login] 인증 성공:', data.userId)
    }

    const handleAuthError = (data: { message: string }) => {
      console.error('[Login] 인증 실패:', data.message)
      setPwErr(data.message)
    }

    // 이벤트 리스너 등록
    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('auth.success', handleAuthSuccess)
    socket.on('auth.error', handleAuthError)

    return () => {
      // cleanup 시 정확한 핸들러 제거
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('auth.success', handleAuthSuccess)
      socket.off('auth.error', handleAuthError)
    }
  }, [])

  // 비밀번호 재확인 실시간 체크
  useEffect(() => {
    if (mode === 'register' && confirm) {
      if (password !== confirm) {
        setPwErr('두 비밀번호 입력이 일치하지 않습니다.')
      } else {
        setPwErr('')
      }
    }
  }, [password, confirm, mode])

  // 사용자명 변경 시 에러 메시지 초기화
  useEffect(() => {
    setIdErr('')
    setIdHint('')
  }, [id])

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!canDisplayGame) {
    return null // App.tsx에서 처리됨
  }

  async function handleCheckDuplicate() {
    if (!id.trim()) {
      setIdErr('사용자명을 입력해주세요.')
      return
    }

    setIdHint('')
    setIdErr('')
    setIsCheckingDuplicate(true)

    // basic front validation
    const alnum = (s: string) => /^[A-Za-z0-9]+$/.test(s)
    const idLenOk = id.length >= 4 && id.length <= 24
    const idCsOk = alnum(id)

    if (!idLenOk || !idCsOk) {
      setIdErr(!idCsOk ? '영문자와 숫자만 사용 가능합니다.' : '사용자명은 4-24자여야 합니다.')
      setIsCheckingDuplicate(false)
      return
    }

    try {
      const r = await checkIdAvailability(id)
      if (r.ok && typeof r.available !== 'undefined') {
        if (r.available) {
          setIdHint('사용 가능한 아이디입니다.')
          setIdErr('')
        } else {
          setIdErr('이미 사용 중인 아이디입니다.')
          setIdHint('')
        }
      }
    } catch {
      setIdErr('중복 확인 중 오류가 발생했습니다.')
    } finally {
      setIsCheckingDuplicate(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 기본 유효성 검사
    const alnum = (s: string) => /^[A-Za-z0-9]+$/.test(s)
    const idLenOk = id.length >= 4 && id.length <= 24
    const idCsOk = alnum(id)
    const pwLenOk = password.length >= 4 && password.length <= 24
    const pwCsOk = alnum(password)

    const idValid = idLenOk && idCsOk
    const pwValid = pwLenOk && pwCsOk

    setIdErr(
      idValid ? '' : !idCsOk ? '영문자와 숫자만 사용 가능합니다.' : '사용자명은 4-24자여야 합니다.'
    )
    setPwErr(pwValid ? '' : '비밀번호는 4-24자여야 합니다.')

    if (!idValid || !pwValid) return

    // 회원가입 모드
    if (mode === 'register') {
      if (password !== confirm) {
        setPwErr('두 비밀번호 입력이 일치하지 않습니다.')
        return
      }

      // 중복 체크 (이미 handleCheckDuplicate에서 확인했지만 한 번 더)
      try {
        const res = await checkIdAvailability(id)
        if (res.ok && res.available === false) {
          setIdErr('이미 사용 중인 아이디입니다.')
          return
        }
      } catch {
        setPwErr('중복 확인 중 오류가 발생했습니다.')
        return
      }

      try {
        const r = await registerRequest(id, password, confirm)
        if (r.ok && r.user && r.token) {
          console.log('[Login] 회원가입 성공, 자동 로그인 진행:', r.user.name)

          // 회원가입 성공 후 자동 로그인 처리
          await handleLoginSuccess(r.user, r.token)
        } else if (r.error === 'DUPLICATE_ID') {
          setIdErr('이미 사용 중인 아이디입니다.')
        } else {
          setPwErr('회원가입에 실패했습니다.')
        }
      } catch {
        setPwErr('회원가입 중 오류가 발생했습니다.')
      }
      return
    }

    // 로그인 모드
    try {
      console.log('[Login] 로그인 시도:', { id, hasPassword: !!password })
      const r = await loginRequest(id, password)
      console.log('[Login] 로그인 응답 전체:', r)
      console.log('[Login] 로그인 응답 상세:', {
        ok: r.ok,
        hasUser: !!r.user,
        hasToken: !!r.token,
        hasExistingSession: r.hasExistingSession,
        userId: r.user?.id,
        userNickname: r.user?.nickname,
        tokenLength: r.token?.length,
      })

      if (r.ok && r.user && r.token) {
        // 중복 로그인 확인
        if (r.hasExistingSession) {
          console.log('[Login] 중복 세션 감지:', r.existingSessionInfo)
          setDuplicateLoginInfo({
            user: r.user,
            token: r.token,
            existingSessionInfo: r.existingSessionInfo,
          })
          setShowDuplicateLoginModal(true)
          return
        }

        // 중복 세션이 없으면 바로 로그인
        console.log('[Login] 중복 세션 없음, 바로 로그인 진행')
        await handleLoginSuccess(r.user, r.token)
        return // 로그인 성공 후 함수 종료
      } else if (r.error === 'USER_NOT_FOUND') {
        setIdErr('존재하지 않는 사용자입니다.')
      } else if (r.error === 'WRONG_PASSWORD') {
        setPwErr('비밀번호가 올바르지 않습니다.')
      } else {
        setPwErr('로그인에 실패했습니다.')
      }
    } catch (error) {
      console.error('[Login] 로그인 오류:', error)
      setPwErr('로그인 중 오류가 발생했습니다.')
    }
  }

  // 로그인 성공 처리 함수
  const handleLoginSuccess = async (
    user: {
      id: string
      name: string
      nickname?: string
      characters?: Array<{
        id: string
        name: string
        level: number
        stats: { str: number; agi: number; sta: number }
      }>
    },
    token: string
  ) => {
    console.log('[Login] handleLoginSuccess 시작:', { userId: user.id, hasToken: !!token })

    try {
      console.log('[Login] 소켓에 세션 등록 시도')
      console.log('[Login] 현재 소켓 연결 상태:', socket.connected)
      console.log('[Login] 소켓 ID:', socket.id)

      // 소켓에 로그인 이벤트 전송하여 서버에 세션 등록
      if (socket.connected) {
        console.log('[Login] 소켓이 이미 연결되어 있음, auth.login 이벤트 전송')
        socket.emit('auth.login', user.id)
        console.log('[Login] auth.login 이벤트 전송됨 (연결된 상태)')
      } else {
        console.log('[Login] 소켓 연결 시도 중...')
        // setSocketStatus('connecting') // Removed

        // 연결 시도 전 현재 상태 확인
        console.log('[Login] 연결 시도 전 소켓 상태:', {
          connected: socket.connected,
          id: socket.id,
        })

        socket.connect()

        // 연결 대기 및 타임아웃 설정
        const connectionPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.log('[Login] 소켓 연결 타임아웃 발생')
            // setSocketStatus('disconnected') // Removed
            reject(new Error('소켓 연결 타임아웃'))
          }, 5000) // 5초 타임아웃

          socket.once('connect', () => {
            console.log('[Login] 소켓 연결 성공, auth.login 이벤트 전송')
            clearTimeout(timeout)
            socket.emit('auth.login', user.id)
            console.log('[Login] auth.login 이벤트 전송됨 (새로 연결됨)')
            resolve()
          })

          socket.once('connect_error', (error) => {
            console.error('[Login] 소켓 연결 에러:', error)
            clearTimeout(timeout)
            // setSocketStatus('disconnected') // Removed
            reject(error)
          })
        })

        await connectionPromise
      }

      console.log('[Login] useAuthStore.setUser 호출 전')
      setUser({
        id: user.id,
        name: user.name,
        nickname: user.nickname || user.name,
        token: token,
        characters: user.characters || [],
      })
      console.log('[Login] useAuthStore.setUser 호출 완료')

      // 로그인 성공 후 입력값 초기화
      setId('')
      setPassword('')
      setIdErr('')
      setPwErr('')

      console.log('[Login] navigate 호출 전')
      navigate('/lobby', { replace: true })
      console.log('[Login] navigate 호출 완료')
    } catch (error) {
      console.error('[Login] handleLoginSuccess 오류:', error)
      setPwErr('소켓 연결에 실패했습니다. 잠시 후 다시 시도해주세요.')
      return // 에러 발생 시 함수 종료
    }
  }

  // 중복 로그인 확인 처리
  const handleDuplicateLoginConfirm = async () => {
    if (!duplicateLoginInfo) return

    try {
      console.log('[Login] 중복 로그인 확인됨, 기존 세션 토큰 만료 처리')

      // 서버에서 이미 토큰을 만료시켰으므로 추가 처리 불필요
      // 바로 로그인 진행
      await handleLoginSuccess(duplicateLoginInfo.user, duplicateLoginInfo.token)
    } catch (error) {
      console.error('[Login] 중복 로그인 처리 중 오류:', error)
      setPwErr('세션 처리 중 오류가 발생했습니다.')
    } finally {
      setShowDuplicateLoginModal(false)
      setDuplicateLoginInfo(null)
      // 중복 로그인 모달 닫힌 후에도 입력값 초기화
      setId('')
      setPassword('')
      setIdErr('')
      setPwErr('')
    }
  }

  // 중복 로그인 취소
  const handleDuplicateLoginCancel = () => {
    setShowDuplicateLoginModal(false)
    setDuplicateLoginInfo(null)
  }

  return (
    <div className="login-layout">
      {/* 배경 이미지 영역 */}
      <div className="login-background">
        <div className="background-overlay"></div>
      </div>

      {/* 로그인 폼 */}
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <h1 className="game-title">Vindex Arena</h1>
            <p className="game-subtitle">검투사의 길에 오신 것을 환영합니다</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                사용자명
              </label>
              <div className="username-group">
                <input
                  type="text"
                  id="username"
                  value={id}
                  onChange={(e) => setId(e.target.value)}
                  className="form-input"
                  placeholder="사용자명을 입력하세요"
                  required
                />
                {mode === 'register' && (
                  <button
                    type="button"
                    onClick={handleCheckDuplicate}
                    disabled={isCheckingDuplicate || !id.trim()}
                    className="duplicate-check-btn"
                  >
                    {isCheckingDuplicate ? '확인 중...' : '중복 확인'}
                  </button>
                )}
              </div>
              {idErr && <div className="error-message">{idErr}</div>}
              {idHint && <div className="success-message">{idHint}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                비밀번호
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="비밀번호를 입력하세요"
                required
              />
            </div>

            {mode === 'register' && (
              <div className="form-group">
                <label htmlFor="confirm" className="form-label">
                  비밀번호 확인
                </label>
                <input
                  type="password"
                  id="confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="form-input"
                  placeholder="비밀번호를 다시 입력하세요"
                  required
                />
                {pwErr && <div className="error-message">{pwErr}</div>}
              </div>
            )}

            <button type="submit" className="login-button">
              {mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          <div className="login-footer">
            <p className="footer-text">
              {mode === 'login' ? '새로운 검투사가 되고 싶다면' : '이미 검투사라면'}
            </p>
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setIdErr('')
                setPwErr('')
                setIdHint('')
                setConfirm('')
              }}
              className="register-link"
            >
              {mode === 'login' ? '회원가입' : '로그인'}
            </button>
          </div>
        </div>
      </div>

      {/* 중복 로그인 확인 모달 */}
      {showDuplicateLoginModal && duplicateLoginInfo && (
        <div className="modal-overlay">
          <div className="modal-content duplicate-login-modal">
            <div className="modal-header">
              <h3>⚠️ 중복 로그인 감지</h3>
            </div>
            <div className="modal-body">
              <p>{duplicateLoginInfo.existingSessionInfo?.message}</p>
              <div className="session-info">
                <p>
                  <strong>계정:</strong> {duplicateLoginInfo.user.nickname}
                </p>
                <p>
                  <strong>마지막 활동:</strong>{' '}
                  {new Date(
                    duplicateLoginInfo.existingSessionInfo?.lastActivity || 0
                  ).toLocaleString()}
                </p>
              </div>
              <p className="warning-text">
                계속 진행하시겠습니까? 기존 세션은 자동으로 종료됩니다.
              </p>
            </div>
            <div className="modal-footer">
              <button className="modal-button cancel-button" onClick={handleDuplicateLoginCancel}>
                취소
              </button>
              <button className="modal-button confirm-button" onClick={handleDuplicateLoginConfirm}>
                계속 진행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
