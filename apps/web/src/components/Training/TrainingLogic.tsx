import { useState, useCallback } from 'react'
import { useAuthStore } from '../../store/auth'
import { call } from '../../lib/api'

export interface TrainingItem {
  id: string
  name: string
  description: string
  category: string
  apCost: number
  goldCost: number
}

export interface TrainingResult {
  success: boolean
  message: string
  expGained?: number
  goldGained?: number
  stressDelta?: number
}

export function useTrainingLogic() {
  const { user } = useAuthStore()
  const [catalog, setCatalog] = useState<TrainingItem[]>([])
  const [busy, setBusy] = useState(false)
  const [currentTraining, setCurrentTraining] = useState<TrainingItem | null>(null)
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null)

  // 훈련 카탈로그 로드
  const loadCatalog = useCallback(async () => {
    if (catalog.length > 0) return

    try {
      const response = await call('/training/catalog')
      if (response.ok) {
        setCatalog(response.items || [])
      }
    } catch (error) {
      console.error('훈련 카탈로그 로드 실패:', error)
    }
  }, [catalog.length])

  // 훈련 실행
  const executeTraining = useCallback(
    async (trainingId: string) => {
      if (!user?.token || busy) return null

      setBusy(true)
      try {
        const response = await call('/training/run', { id: trainingId })

        if (response.ok) {
          const trainingItem = catalog.find((item) => item.id === trainingId)
          if (trainingItem) {
            setCurrentTraining(trainingItem)
          }
          return response
        }

        return response
      } catch (error) {
        console.error('훈련 실행 실패:', error)
        return null
      } finally {
        setBusy(false)
      }
    },
    [user?.token, busy, catalog]
  )

  // 빠른 액션 실행
  const executeQuickAction = useCallback(
    async (actionType: string) => {
      if (!user?.token || busy) return null

      setBusy(true)
      try {
        const response = await call('/training/quick', { type: actionType })
        return response
      } catch (error) {
        console.error('빠른 액션 실행 실패:', error)
        return null
      } finally {
        setBusy(false)
      }
    },
    [user?.token, busy]
  )

  // 훈련 결과 설정
  const setResult = useCallback((result: TrainingResult) => {
    setTrainingResult(result)
  }, [])

  // 훈련 결과 초기화
  const clearResult = useCallback(() => {
    setTrainingResult(null)
    setCurrentTraining(null)
  }, [])

  // 훈련 진행 상태 확인
  const canExecuteTraining = useCallback(
    (item: TrainingItem) => {
      if (!user?.character) return false

      const { ap, gold } = user.character.resources
      return ap >= item.apCost && gold >= item.goldCost
    },
    [user?.character]
  )

  return {
    // 상태
    catalog,
    busy,
    currentTraining,
    trainingResult,

    // 액션
    loadCatalog,
    executeTraining,
    executeQuickAction,
    setResult,
    clearResult,

    // 유틸리티
    canExecuteTraining,
  }
}
