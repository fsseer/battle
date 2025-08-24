import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/auth'

export function useApRecovery() {
  const { user, updateAp } = useAuthStore()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    // user가 없거나 토큰이 없으면 AP 회복을 시작하지 않음
    if (!user) {
      console.log('[useApRecovery] 사용자 정보가 없습니다. AP 회복을 시작하지 않습니다.')
      return
    }

    // 토큰 유효성 체크
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('[useApRecovery] 토큰이 없습니다. AP 회복을 시작하지 않습니다.')
      return
    }

    console.log('[useApRecovery] AP 회복 시스템을 시작합니다.')

    // 마지막 업데이트 시간 설정 (한 번만)
    if (lastUpdateRef.current === 0) {
      lastUpdateRef.current = user.lastApUpdate || Date.now()
    }

    // 10초마다 AP 회복 체크
    intervalRef.current = setInterval(() => {
      // 토큰이 여전히 유효한지 재확인
      const currentToken = localStorage.getItem('token')
      if (!currentToken) {
        console.log('[useApRecovery] 토큰이 만료되었습니다. AP 회복을 중단합니다.')
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        return
      }

      const now = Date.now()
      const timeDiff = now - lastUpdateRef.current
      const recoveryAmount = Math.floor(timeDiff / 10000) // 10초마다 1씩

      if (recoveryAmount > 0 && user.ap < user.apMax) {
        const newAp = Math.min(user.ap + recoveryAmount, user.apMax)
        updateAp(newAp)
        lastUpdateRef.current = now
        console.log(`[useApRecovery] AP 회복: ${user.ap} → ${newAp}`)
      }
    }, 10000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        console.log('[useApRecovery] AP 회복 시스템을 정리합니다.')
      }
    }
  }, [user?.id]) // user.id만 의존성으로 설정하여 무한 리렌더링 방지

  // 컴포넌트 언마운트시 정리
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        console.log('[useApRecovery] 컴포넌트 언마운트: AP 회복 시스템을 정리합니다.')
      }
    }
  }, [])
}
