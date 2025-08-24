import { useEffect, useRef, useCallback, useState } from 'react'
import { socket } from '../lib/socket'

// 간단한 타입 정의
interface SimpleUpdate<T = unknown> {
  type: string
  data: T
  timestamp: number
}

export function useHybridSync<T = unknown>(
  config: {
    endpoint: string
    onData?: (data: T) => void
    onError?: (error: Error) => void
    autoSync?: boolean
    syncInterval?: number
  }
) {
  const { endpoint, onData, onError, autoSync = true, syncInterval = 5000 } = config
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<SimpleUpdate<T> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const syncTimeoutRef = useRef<number | null>(null)

  // 데이터 동기화
  const syncData = useCallback(async () => {
    if (!endpoint) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(endpoint)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      
      const update: SimpleUpdate<T> = {
        type: 'sync',
        data,
        timestamp: Date.now()
      }
      
      setLastUpdate(update)
      onData?.(data)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      onError?.(error)
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, onData, onError])

  // 자동 동기화 설정
  useEffect(() => {
    if (!autoSync) return

    syncData()

    if (syncInterval > 0) {
      syncTimeoutRef.current = window.setInterval(syncData, syncInterval)
    }

    return () => {
      if (syncTimeoutRef.current) {
        window.clearInterval(syncTimeoutRef.current)
      }
    }
  }, [autoSync, syncInterval, syncData])

  // 웹소켓 구독
  useEffect(() => {
    if (!endpoint) return

    const handleSocketUpdate = (data: unknown) => {
      const update: SimpleUpdate<T> = {
        type: 'socket',
        data: data as T,
        timestamp: Date.now()
      }
      
      setLastUpdate(update)
      onData?.(data as T)
    }

    socket.on(endpoint, handleSocketUpdate)
    setIsSubscribed(true)

    return () => {
      socket.off(endpoint, handleSocketUpdate)
      setIsSubscribed(false)
    }
  }, [endpoint, onData])

  return {
    isSubscribed,
    lastUpdate,
    isLoading,
    error,
    syncData
  }
}

// 특정 용도별 훅들
export function useBattleSync(battleId: string, onUpdate?: (data: unknown) => void) {
  return useHybridSync({
    endpoint: `battle:${battleId}`,
    onData: onUpdate,
  })
}

export function useResourcesSync(characterId: string, onUpdate?: (data: unknown) => void) {
  return useHybridSync({
    endpoint: `resources:${characterId}`,
    onData: onUpdate,
  })
}

export function useCharacterStatsSync(characterId: string, onUpdate?: (data: unknown) => void) {
  return useHybridSync({
    endpoint: `character:${characterId}`,
    onData: onUpdate,
    autoSync: true,
    syncInterval: 30000, // 30초
  })
}

export function useTrainingSync(characterId: string, onUpdate?: (data: unknown) => void) {
  return useHybridSync({
    endpoint: `training:${characterId}`,
    onData: onUpdate,
  })
}

// 다중 엔티티 하이브리드 동기화
export function useMultiEntityHybridSync(configs: { endpoint: string; onData?: (data: unknown) => void; autoSync?: boolean; syncInterval?: number }[]) {
  const [updates, setUpdates] = useState<Map<string, SimpleUpdate<unknown>>>(new Map())

  useEffect(() => {
    const handleDataUpdate = (data: unknown) => {
      const key = Object.keys(data as Record<string, unknown>)[0] // 웹소켓 이벤트에서 엔티티 이름이 키로 오므로
      const update: SimpleUpdate<unknown> = {
        type: 'socket',
        data: (data as Record<string, unknown>)[key], // 실제 데이터는 값으로 오므로
        timestamp: Date.now()
      }
      setUpdates((prev: Map<string, SimpleUpdate<unknown>>) => new Map(prev).set(key, update))
    }

    // 각 엔티티별로 적절한 전략 적용
    configs.forEach((config) => {
      if (config.autoSync) {
        socket.on(config.endpoint, handleDataUpdate)
      }
    })

    return () => {
      // 정리
      configs.forEach((config) => {
        if (config.autoSync) {
          socket.off(config.endpoint, handleDataUpdate)
        }
      })
    }
  }, [configs])

  return updates
}
