import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export function useTokenValidation() {
  const navigate = useNavigate()
  const { validateTokenWithServer } = useAuthStore()

  useEffect(() => {
    // 컴포넌트 마운트 시 서버에 토큰 유효성 검증
    const checkTokenValidity = async () => {
      const isValid = await validateTokenWithServer()
      if (!isValid) {
        console.log('[useTokenValidation] 서버 검증 실패, 로그인 페이지로 이동')
        navigate('/login', { replace: true })
        return
      }
      console.log('[useTokenValidation] 서버 검증 성공')
    }

    checkTokenValidity()
  }, [validateTokenWithServer, navigate])

  // 수동 토큰 검증 함수 반환
  const checkToken = async () => {
    const isValid = await validateTokenWithServer()
    if (!isValid) {
      console.log('[useTokenValidation] 수동 토큰 검증 실패, 로그인 페이지로 이동')
      navigate('/login', { replace: true })
      return false
    }
    return true
  }

  return { checkToken }
}
