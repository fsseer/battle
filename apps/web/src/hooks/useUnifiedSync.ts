import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '../store/auth'
import { useHybridSync } from './useHybridSync'

export function useUnifiedSync() {
  const { user } = useAuthStore()
  const [isActive, setIsActive] = useState(false)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle')

  // 캐릭터 동기화
  const characterSync = useHybridSync({
    endpoint: `character:${user?.id || ''}`,
    onData: (data: unknown) => {
      console.log('[UnifiedSync] 캐릭터 데이터 수신', data)
      setLastSync(new Date())
      setSyncStatus('success')
    },
    onError: (error: Error) => {
      console.error('[UnifiedSync] 캐릭터 동기화 에러', error)
      setSyncStatus('error')
    },
    autoSync: true,
    syncInterval: 30000 // 30초
  })

  // 자원 동기화
  const resourcesSync = useHybridSync({
    endpoint: `resources:${user?.id || ''}`,
    onData: (data: unknown) => {
      console.log('[UnifiedSync] 자원 데이터 수신', data)
      setLastSync(new Date())
      setSyncStatus('success')
    },
    onError: (error: Error) => {
      console.error('[UnifiedSync] 자원 동기화 에러', error)
      setSyncStatus('error')
    },
    autoSync: true,
    syncInterval: 10000 // 10초
  })

  // 수동 동기화
  const manualSync = useCallback(async () => {
    setSyncStatus('syncing')
    
    try {
      await Promise.all([
        characterSync.syncData(),
        resourcesSync.syncData()
      ])
      
      setLastSync(new Date())
      setSyncStatus('success')
      setIsActive(true)
    } catch (error) {
      console.error('[UnifiedSync] 수동 동기화 실패', error)
      setSyncStatus('error')
    }
  }, [characterSync, resourcesSync])

  // 초기 동기화
  useEffect(() => {
    if (user?.id) {
      manualSync()
    }
  }, [user?.id, manualSync])

  // 동기화 상태 모니터링
  useEffect(() => {
    if (characterSync.isSubscribed || resourcesSync.isSubscribed) {
      setIsActive(true)
    }
  }, [characterSync.isSubscribed, resourcesSync.isSubscribed])

  return {
    isActive,
    lastSync,
    syncStatus,
    manualSync,
    characterSync,
    resourcesSync,
    syncState: {
      character: characterSync.isSubscribed,
      resources: resourcesSync.isSubscribed,
      lastUpdate: lastSync,
      status: syncStatus
    }
  }
}
