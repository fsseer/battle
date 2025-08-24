import { useEffect, useRef, useCallback, useState } from 'react'
import { useSocket } from './useSocket'
import { RealTimeUpdate } from '../types/api'
import { useGameStore } from '../store/game'

export interface SyncConfig {
  entity: string
  entityId: string
  strategy: 'REALTIME' | 'POLLING' | 'EVENT_DRIVEN'
  pollingInterval?: number
  autoSubscribe?: boolean
  onUpdate?: (data: any) => void
  onError?: (error: Error) => void
}

export function useHybridSync(config: SyncConfig) {
  const {
    entity,
    entityId,
    strategy,
    pollingInterval,
    autoSubscribe = true,
    onUpdate,
    onError,
  } = config
  const socket = useSocket()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<RealTimeUpdate<any> | null>(null)
  const [isPolling, setIsPolling] = useState(false)

  const subscriptionRef = useRef<string | null>(null)
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const { updateCharacter, updateResources } = useGameStore()

  // 웹소켓 구독
  const subscribeWebSocket = useCallback(() => {
    if (!socket?.connected) {
      console.warn('[useHybridSync] 웹소켓이 연결되지 않음')
      return false
    }

    try {
      socket.emit('subscribe', { entity, entityId })
      setIsSubscribed(true)
      subscriptionRef.current = `${entity}:${entityId}`

      console.log('[useHybridSync] 웹소켓 구독 성공', { entity, entityId, strategy })
      return true
    } catch (error) {
      console.error('[useHybridSync] 웹소켓 구독 실패', error)
      onError?.(error as Error)
      return false
    }
  }, [socket, entity, entityId, strategy, onError])

  // 웹소켓 구독 해제
  const unsubscribeWebSocket = useCallback(() => {
    if (!socket || !isSubscribed) return

    try {
      socket.emit('unsubscribe', { entity, entityId })
      setIsSubscribed(false)
      subscriptionRef.current = null

      console.log('[useHybridSync] 웹소켓 구독 해제됨', { entity, entityId })
    } catch (error) {
      console.error('[useHybridSync] 웹소켓 구독 해제 실패', error)
    }
  }, [socket, entity, entityId, isSubscribed])

  // 폴링 시작
  const startPolling = useCallback(() => {
    if (strategy !== 'POLLING' || !pollingInterval) return

    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
    }

    const timer = setInterval(async () => {
      try {
        // 폴링 API 호출
        const response = await fetch(`/api/${entity}/${entityId}`)
        if (response.ok) {
          const data = await response.json()
          handleUpdate(data)
        }
      } catch (error) {
        console.error('[useHybridSync] 폴링 실패', error)
        onError?.(error as Error)
      }
    }, pollingInterval)

    pollingTimerRef.current = timer
    setIsPolling(true)

    console.log('[useHybridSync] 폴링 시작', { entity, entityId, interval: pollingInterval })
  }, [strategy, pollingInterval, entity, entityId, onError])

  // 폴링 정지
  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearInterval(pollingTimerRef.current)
      pollingTimerRef.current = null
      setIsPolling(false)

      console.log('[useHybridSync] 폴링 정지', { entity, entityId })
    }
  }, [entity, entityId])

  // 업데이트 처리
  const handleUpdate = useCallback(
    (data: any) => {
      setLastUpdate({
        type: 'UPDATE',
        entity,
        id: entityId,
        data,
        timestamp: new Date().toISOString(),
        version: Date.now(),
      })

      // 게임 상태 자동 업데이트
      if (entity === 'character') {
        updateCharacter(data)
      } else if (entity === 'resources') {
        updateResources(data)
      }

      // 사용자 정의 콜백 실행
      if (onUpdate) {
        onUpdate(data)
      }

      console.log('[useHybridSync] 데이터 업데이트 수신', { entity, entityId, strategy })
    },
    [entity, entityId, onUpdate, updateCharacter, updateResources]
  )

  // 웹소켓 이벤트 리스너 설정
  useEffect(() => {
    if (!socket || strategy !== 'REALTIME') return

    const handleDataUpdate = (update: RealTimeUpdate<any>) => {
      if (update.entity === entity && update.id === entityId) {
        handleUpdate(update.data)
      }
    }

    socket.on('dataUpdate', handleDataUpdate)

    return () => {
      socket.off('dataUpdate', handleDataUpdate)
    }
  }, [socket, strategy, entity, entityId, handleUpdate])

  // 자동 구독/해제 및 전략별 처리
  useEffect(() => {
    if (!autoSubscribe) return

    if (strategy === 'REALTIME' && socket?.connected) {
      // 실시간: 웹소켓 구독
      subscribeWebSocket()
    } else if (strategy === 'POLLING') {
      // 폴링: 타이머 시작
      startPolling()
    } else if (strategy === 'EVENT_DRIVEN' && socket?.connected) {
      // 이벤트 기반: 웹소켓 구독 (중요한 변경사항만)
      subscribeWebSocket()
    }

    return () => {
      if (strategy === 'REALTIME' || strategy === 'EVENT_DRIVEN') {
        unsubscribeWebSocket()
      } else if (strategy === 'POLLING') {
        stopPolling()
      }
    }
  }, [
    autoSubscribe,
    strategy,
    socket?.connected,
    subscribeWebSocket,
    unsubscribeWebSocket,
    startPolling,
    stopPolling,
  ])

  // 소켓 연결 상태 변경 시 재구독
  useEffect(() => {
    if (
      socket?.connected &&
      isSubscribed &&
      (strategy === 'REALTIME' || strategy === 'EVENT_DRIVEN')
    ) {
      subscribeWebSocket()
    }
  }, [socket?.connected, isSubscribed, strategy, subscribeWebSocket])

  return {
    isSubscribed,
    isPolling,
    lastUpdate,
    strategy,
    subscribeWebSocket,
    unsubscribeWebSocket,
    startPolling,
    stopPolling,
  }
}

// 전투 전용 실시간 동기화 (빠른 응답 필요)
export function useBattleSync(battleId: string, onUpdate?: (data: any) => void) {
  return useHybridSync({
    entity: 'battle',
    entityId: battleId,
    strategy: 'REALTIME',
    onUpdate,
  })
}

// 자원 전용 이벤트 기반 동기화 (중요한 변경사항만)
export function useResourcesSync(characterId: string, onUpdate?: (data: any) => void) {
  return useHybridSync({
    entity: 'resources',
    entityId: characterId,
    strategy: 'EVENT_DRIVEN',
    onUpdate,
  })
}

// 캐릭터 스탯 폴링 동기화 (트래픽 최소화)
export function useCharacterStatsSync(characterId: string, onUpdate?: (data: any) => void) {
  return useHybridSync({
    entity: 'character',
    entityId: characterId,
    strategy: 'POLLING',
    pollingInterval: 30000, // 30초
    onUpdate,
  })
}

// 훈련 결과 이벤트 기반 동기화
export function useTrainingSync(characterId: string, onUpdate?: (data: any) => void) {
  return useHybridSync({
    entity: 'training',
    entityId: characterId,
    strategy: 'EVENT_DRIVEN',
    onUpdate,
  })
}

// 다중 엔티티 하이브리드 동기화
export function useMultiEntityHybridSync(configs: SyncConfig[]) {
  const socket = useSocket()
  const [updates, setUpdates] = useState<Map<string, RealTimeUpdate<any>>>(new Map())

  useEffect(() => {
    if (!socket) return

    const handleDataUpdate = (update: RealTimeUpdate<any>) => {
      const key = `${update.entity}:${update.id}`
      setUpdates((prev) => new Map(prev).set(key, update))
    }

    socket.on('dataUpdate', handleDataUpdate)

    // 각 엔티티별로 적절한 전략 적용
    configs.forEach((config) => {
      if (config.strategy === 'REALTIME' || config.strategy === 'EVENT_DRIVEN') {
        socket.emit('subscribe', { entity: config.entity, entityId: config.entityId })
      }
    })

    return () => {
      socket.off('dataUpdate', handleDataUpdate)

      configs.forEach((config) => {
        if (config.strategy === 'REALTIME' || config.strategy === 'EVENT_DRIVEN') {
          socket.emit('unsubscribe', { entity: config.entity, entityId: config.entityId })
        }
      })
    }
  }, [socket, configs])

  return updates
}
