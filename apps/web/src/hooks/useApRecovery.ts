import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/auth'

export function useApRecovery() {
  const { user } = useAuthStore()
  const intervalRef = useRef<number | null>(null)
  const lastUpdateRef = useRef<number>(0)

  useEffect(() => {
    if (!user) return

    // AP 자동 회복 시작
    intervalRef.current = window.setInterval(() => {
      const now = Date.now()
      const timeDiff = now - lastUpdateRef.current
      const recoveryAmount = Math.floor(timeDiff / (5 * 60 * 1000)) // 5분마다 1씩

      if (recoveryAmount > 0 && (user.ap ?? 0) < (user.apMax ?? 100)) {
        const newAp = Math.min((user.ap ?? 0) + recoveryAmount, user.apMax ?? 100)
        // AP 업데이트는 별도로 처리해야 함
        lastUpdateRef.current = now
        console.log(`[useApRecovery] AP 회복: ${user.ap} → ${newAp}`)
      }
    }, 5 * 60 * 1000) // 5분마다 체크

    console.log('[useApRecovery] AP 자동 회복 시작')

    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current)
        intervalRef.current = null
        console.log('[useApRecovery] AP 자동 회복 정리')
      }
    }
  }, [user?.ap, user?.apMax])
}
