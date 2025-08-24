import { useCallback, useEffect, useState } from 'react'
import { useHybridSync } from './useHybridSync'
import { useResourceSync } from './useResourceSync'
import { useGameStore } from '../store/game'
import { useAuthStore } from '../store/auth'

export interface UnifiedSyncConfig {
  characterId: string
  enableHybridSync?: boolean
  enableLegacySync?: boolean
  syncInterval?: number
}

export function useUnifiedSync(config: UnifiedSyncConfig) {
  const {
    characterId,
    enableHybridSync = true,
    enableLegacySync = true,
    syncInterval = 30000,
  } = config
  const { user } = useAuthStore()
  const { updateCharacter, updateResources } = useGameStore()

  const [isHybridActive, setIsHybridActive] = useState(false)
  const [isLegacyActive, setIsLegacyActive] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<number>(0)

  // 하이브리드 동기화 (새로운 시스템)
  const characterSync = useHybridSync({
    entity: 'character',
    entityId: characterId,
    strategy: 'POLLING',
    pollingInterval: syncInterval,
    onUpdate: (data) => {
      updateCharacter(data)
      setLastSyncTime(Date.now())
      console.log('[UnifiedSync] 하이브리드 캐릭터 업데이트', data)
    },
  })

  const resourcesSync = useHybridSync({
    entity: 'resources',
    entityId: characterId,
    strategy: 'EVENT_DRIVEN',
    onUpdate: (data) => {
      updateResources(data)
      setLastSyncTime(Date.now())
      console.log('[UnifiedSync] 하이브리드 자원 업데이트', data)
    },
  })

  // 레거시 동기화 (기존 시스템)
  const { syncUserResources, isRetrying, errorCount } = useResourceSync()

  // 통합 동기화 함수
  const performUnifiedSync = useCallback(async () => {
    if (!user?.token) return

    try {
      setLastSyncTime(Date.now())

      if (enableHybridSync && isHybridActive) {
        // 하이브리드 시스템이 활성화된 경우
        console.log('[UnifiedSync] 하이브리드 동기화 수행')
        // 하이브리드 시스템은 자동으로 동기화됨
      } else if (enableLegacySync) {
        // 레거시 시스템 사용
        console.log('[UnifiedSync] 레거시 동기화 수행')
        const result = await syncUserResources()
        if (result.success) {
          setIsLegacyActive(true)
        }
      }
    } catch (error) {
      console.error('[UnifiedSync] 통합 동기화 실패', error)
    }
  }, [user?.token, enableHybridSync, enableLegacySync, isHybridActive, syncUserResources])

  // 자동 동기화 시작
  useEffect(() => {
    if (!characterId || !user?.token) return

    // 초기 동기화
    performUnifiedSync()

    // 주기적 동기화 (하이브리드 시스템이 비활성화된 경우에만)
    if (!enableHybridSync || !isHybridActive) {
      const interval = setInterval(performUnifiedSync, syncInterval)
      return () => clearInterval(interval)
    }
  }, [characterId, user?.token, enableHybridSync, isHybridActive, performUnifiedSync, syncInterval])

  // 하이브리드 시스템 상태 모니터링
  useEffect(() => {
    if (characterSync.isPolling || resourcesSync.isSubscribed) {
      setIsHybridActive(true)
      console.log('[UnifiedSync] 하이브리드 시스템 활성화됨')
    } else {
      setIsHybridActive(false)
      console.log('[UnifiedSync] 하이브리드 시스템 비활성화됨')
    }
  }, [characterSync.isPolling, resourcesSync.isSubscribed])

  // 수동 동기화 트리거
  const triggerSync = useCallback(() => {
    performUnifiedSync()
  }, [performUnifiedSync])

  // 동기화 상태 정보
  const getSyncStatus = useCallback(() => {
    return {
      hybrid: {
        active: isHybridActive,
        character: characterSync.isPolling,
        resources: resourcesSync.isSubscribed,
      },
      legacy: {
        active: isLegacyActive,
        retrying: isRetrying,
        errorCount,
      },
      lastSync: lastSyncTime,
      nextSync: lastSyncTime + syncInterval,
    }
  }, [
    isHybridActive,
    characterSync.isPolling,
    resourcesSync.isSubscribed,
    isLegacyActive,
    isRetrying,
    errorCount,
    lastSyncTime,
    syncInterval,
  ])

  return {
    // 하이브리드 동기화 상태
    characterSync,
    resourcesSync,
    isHybridActive,

    // 레거시 동기화 상태
    isLegacyActive,
    isRetrying,
    errorCount,

    // 통합 기능
    triggerSync,
    performUnifiedSync,
    getSyncStatus,

    // 마지막 동기화 시간
    lastSyncTime,
  }
}

// 특정 씬에서 사용할 수 있는 간단한 훅들
export function useCharacterSync(characterId: string) {
  return useUnifiedSync({
    characterId,
    enableHybridSync: true,
    enableLegacySync: false,
  })
}

export function useResourcesSync(characterId: string) {
  return useUnifiedSync({
    characterId,
    enableHybridSync: true,
    enableLegacySync: true,
  })
}

export function useGameSync(characterId: string) {
  return useUnifiedSync({
    characterId,
    enableHybridSync: true,
    enableLegacySync: true,
    syncInterval: 60000, // 1분
  })
}
