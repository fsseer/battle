import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'

export function useResourceSync(autoLogoutOnFailure = true, maxRetries = 3, retryDelay = 5000) {
  const navigate = useNavigate()
  const { user, logout, restoreToken, updateUserResources } = useAuthStore()
  const [isRetrying, setIsRetrying] = useState(false)
  const [errorCount, setErrorCount] = useState(0)

  const syncUserResources = useCallback(async () => {
    try {
      console.log('[ResourceSync] 자원 동기화 시작')

      // 공통 API 설정에서 서버 주소 사용 (환경에 따라 자동 결정)
      const { SERVER_ORIGIN } = await import('../lib/api')
      const serverUrl = SERVER_ORIGIN

      // useAuthStore의 토큰을 우선 사용, 없으면 localStorage에서 복원
      const token = user?.token || restoreToken()

      if (!token) {
        console.error('[ResourceSync] 토큰이 없습니다. 로그인이 필요합니다.')
        if (autoLogoutOnFailure) {
          logout()
          navigate('/login')
        }
        return
      }

      const response = await fetch(`${serverUrl}/api/user/resources`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      console.log('[ResourceSync] 서버 응답 상태:', response.status, response.statusText)

      if (response.ok) {
        const data = await response.json()
        console.log('[ResourceSync] 서버 응답 데이터:', data)

        // 성공 시 에러 카운터 리셋
        setErrorCount(0)

        // 서버 값으로 클라이언트 자원 정보 업데이트
        if (updateUserResources) {
          console.log('[ResourceSync] updateUserResources 호출:', {
            ap: data.resources?.ap,
            gold: data.resources?.gold,
            stress: data.resources?.stress,
            lastApUpdate: data.resources?.lastApUpdate || Date.now(),
          })

          updateUserResources({
            ap: data.resources?.ap,
            gold: data.resources?.gold,
            stress: data.resources?.stress,
            lastApUpdate: data.resources?.lastApUpdate || Date.now(),
          })
          console.log('[ResourceSync] 자원 정보 업데이트 완료')
        }

        return { success: true, data }
      } else {
        // 에러 응답 내용 확인
        const errorText = await response.text()
        console.error('[ResourceSync] 자원 정보 조회 실패:', response.status, response.statusText)
        console.error('[ResourceSync] 에러 응답 내용:', errorText)

        // 인증 관련 에러 (401, 403) 시 자동 로그아웃
        if (response.status === 401 || response.status === 403) {
          console.error('[ResourceSync] 인증 실패로 인해 자동 로그아웃합니다.')
          if (autoLogoutOnFailure) {
            // useAuthStore의 토큰 만료 처리 함수 사용
            const { useAuthStore } = await import('../store/auth')
            useAuthStore.getState().handleTokenExpiration()
          }
          return { success: false, error: 'AUTH_FAILED' }
        }

        // 연속 실패 시 자동 로그아웃
        if (errorCount >= maxRetries) {
          console.error('[ResourceSync] 연속 에러로 인해 자동 로그아웃합니다.')
          if (autoLogoutOnFailure) {
            logout()
            navigate('/login')
          }
          return { success: false, error: 'MAX_RETRIES_EXCEEDED' }
        }

        // 에러 카운터 증가
        setErrorCount((prev) => prev + 1)

        // 재시도 로직 (무한 루프 방지)
        if (errorCount < maxRetries && !isRetrying) {
          setIsRetrying(true)
          setTimeout(() => {
            setIsRetrying(false)
            // 재시도는 한 번만
            if (errorCount < maxRetries - 1) {
              syncUserResources()
            }
          }, retryDelay)
        }

        return { success: false, error: 'SYNC_FAILED' }
      }
    } catch (error) {
      console.error('[ResourceSync] 자원 정보 싱크 실패:', error)

      // 네트워크 오류 시에도 에러 카운터 증가
      setErrorCount((prev) => prev + 1)

      // 연속 실패 시 자동 로그아웃
      if (errorCount >= maxRetries) {
        console.error('[ResourceSync] 연속 네트워크 오류로 인해 자동 로그아웃합니다.')
        if (autoLogoutOnFailure) {
          logout()
          navigate('/login')
        }
        return { success: false, error: 'NETWORK_FAILED' }
      }

      // 재시도 로직
      if (errorCount < maxRetries) {
        setIsRetrying(true)
        setTimeout(() => {
          setIsRetrying(false)
          syncUserResources()
        }, retryDelay)
      }

      return { success: false, error: 'NETWORK_FAILED' }
    }
  }, [user?.token, restoreToken, logout, navigate, updateUserResources, errorCount, isRetrying])

  const resetErrorCount = useCallback(() => {
    setErrorCount(0)
  }, [])

  return {
    syncUserResources,
    isRetrying,
    errorCount,
    resetErrorCount,
  }
}
