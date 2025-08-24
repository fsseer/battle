import { useEffect, useState, useCallback } from 'react'
import { socket } from '../lib/socket'

// 간단한 타입 정의
interface SimpleUpdate<T = unknown> {
  type: string
  data: T
  timestamp: number
}

export function useRealtimeSync<T = unknown>(
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
      const interval = setInterval(syncData, syncInterval)
      return () => clearInterval(interval)
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

// 다중 엔티티 실시간 동기화
export function useMultiEntityRealtimeSync(configs: { endpoint: string; onData?: (data: unknown) => void; autoSync?: boolean; syncInterval?: number }[]) {
  const [updates, setUpdates] = useState<Map<string, SimpleUpdate<unknown>>>(new Map())

  useEffect(() => {
    const handleDataUpdate = (data: unknown) => {
      const key = Object.keys(data as Record<string, unknown>)[0]
      const update: SimpleUpdate<unknown> = {
        type: 'socket',
        data: (data as Record<string, unknown>)[key],
        timestamp: Date.now()
      }
      setUpdates((prev: Map<string, SimpleUpdate<unknown>>) => new Map(prev).set(key, update))
    }

    configs.forEach((config) => {
      if (config.autoSync) {
        socket.on(config.endpoint, handleDataUpdate)
      }
    })

    return () => {
      configs.forEach((config) => {
        if (config.autoSync) {
          socket.off(config.endpoint, handleDataUpdate)
        }
      })
    }
  }, [configs])

  return updates
}
