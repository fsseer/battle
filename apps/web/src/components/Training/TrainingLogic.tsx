import { useState, useCallback, useMemo } from 'react'
import { useAuthStore } from '../../store/auth'
import { call } from '../../lib/api'

export interface TrainingItem {
  id: string
  name: string
  description: string
  apCost: number
  goldCost: number
  type: 'basic' | 'weapon' | 'str' | 'agi' | 'int' | 'one' | 'two' | 'dual'
}

export function useTrainingLogic() {
  const { user } = useAuthStore()
  const [catalog, setCatalog] = useState<TrainingItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // 훈련 카탈로그 로드
  const loadCatalog = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await call('/training/catalog', {})
      if (response && typeof response === 'object' && 'ok' in response && response.ok) {
        const data = response as { items?: TrainingItem[] }
        setCatalog(data.items || [])
      }
    } catch (error) {
      console.error('훈련 카탈로그 로드 실패:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 훈련 실행
  const executeTraining = useCallback(async (item: TrainingItem) => {
    try {
      setIsLoading(true)
      const response = await call('/training/execute', { itemId: item.id })
      if (response && typeof response === 'object' && 'ok' in response && response.ok) {
        console.log('훈련 실행 성공:', item.name)
        return true
      }
      return false
    } catch (error) {
      console.error('훈련 실행 실패:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 사용자의 AP와 골드 확인
  const canStartTraining = useMemo(() => {
    if (!user) return false
    const { ap, gold } = user
    return (ap ?? 0) >= 10 && (gold ?? 0) >= 50
  }, [user?.ap, user?.gold])

  const canExecuteTraining = useCallback(
    (item: TrainingItem) => {
      if (!user) return false
      const { ap, gold } = user
      return (ap ?? 0) >= item.apCost && (gold ?? 0) >= item.goldCost
    },
    [user?.ap, user?.gold]
  )

  return {
    catalog,
    isLoading,
    canStartTraining,
    canExecuteTraining,
    loadCatalog,
    executeTraining,
  }
}
