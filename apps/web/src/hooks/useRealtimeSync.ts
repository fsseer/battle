import { useEffect, useRef, useCallback, useState } from 'react'
import { useSocket } from './useSocket'
import { RealTimeUpdate, DataSubscription } from '../types/api'
import { useGameStore } from '../store/game'

export function useRealtimeSync<T = any>(
  entity: string,
  entityId: string,
  options: {
    autoSubscribe?: boolean
    onUpdate?: (data: T) => void
    onError?: (error: Error) => void
  } = {}
) {
  const { autoSubscribe = true, onUpdate, onError } = options
  const socket = useSocket()
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<RealTimeUpdate<T> | null>(null)
  const subscriptionRef = useRef<DataSubscription<T> | null>(null)
  const { updateCharacter, updateResources } = useGameStore()

  // 구독 함수
  const subscribe = useCallback(() => {
    if (!socket || !socket.connected) {
      console.warn('[useRealtimeSync] 소켓이 연결되지 않음')
      return false
    }

    try {
      socket.emit('subscribe', { entity, entityId })
      setIsSubscribed(true)

      // 구독 객체 생성
      subscriptionRef.current = {
        id: `${entity}:${entityId}:${Date.now()}`,
        entity,
        entityId,
        callback: onUpdate || (() => {}),
        isActive: true,
      }

      console.log('[useRealtimeSync] 구독 성공', { entity, entityId })
      return true
    } catch (error) {
      console.error('[useRealtimeSync] 구독 실패', error)
      onError?.(error as Error)
      return false
    }
  }, [socket, entity, entityId, onUpdate, onError])

  // 구독 해제 함수
  const unsubscribe = useCallback(() => {
    if (!socket || !isSubscribed) return

    try {
      socket.emit('unsubscribe', { entity, entityId })
      setIsSubscribed(false)

      if (subscriptionRef.current) {
        subscriptionRef.current.isActive = false
        subscriptionRef.current = null
      }

      console.log('[useRealtimeSync] 구독 해제됨', { entity, entityId })
    } catch (error) {
      console.error('[useRealtimeSync] 구독 해제 실패', error)
    }
  }, [socket, entity, entityId, isSubscribed])

  // 데이터 업데이트 처리
  const handleDataUpdate = useCallback(
    (update: RealTimeUpdate<T>) => {
      if (update.entity === entity && update.id === entityId) {
        setLastUpdate(update)

        // 게임 상태 자동 업데이트
        if (entity === 'character' && update.type === 'UPDATE') {
          updateCharacter(update.data as any)
        } else if (entity === 'resources' && update.type === 'UPDATE') {
          updateResources(update.data as any)
        }

        // 사용자 정의 콜백 실행
        if (onUpdate) {
          onUpdate(update.data)
        }

        console.log('[useRealtimeSync] 데이터 업데이트 수신', {
          entity,
          entityId,
          type: update.type,
        })
      }
    },
    [entity, entityId, onUpdate, updateCharacter, updateResources]
  )

  // 소켓 이벤트 리스너 설정
  useEffect(() => {
    if (!socket) return

    socket.on('dataUpdate', handleDataUpdate)

    return () => {
      socket.off('dataUpdate', handleDataUpdate)
    }
  }, [socket, handleDataUpdate])

  // 자동 구독/해제
  useEffect(() => {
    if (autoSubscribe && socket?.connected) {
      subscribe()
    }

    return () => {
      if (isSubscribed) {
        unsubscribe()
      }
    }
  }, [autoSubscribe, socket?.connected, subscribe, unsubscribe, isSubscribed])

  // 소켓 연결 상태 변경 시 재구독
  useEffect(() => {
    if (socket?.connected && isSubscribed) {
      // 연결이 끊어졌다가 다시 연결된 경우 재구독
      subscribe()
    }
  }, [socket?.connected, isSubscribed, subscribe])

  return {
    isSubscribed,
    lastUpdate,
    subscribe,
    unsubscribe,
    subscription: subscriptionRef.current,
  }
}

// 특정 엔티티 타입별 전용 훅들
export function useCharacterSync(characterId: string) {
  return useRealtimeSync('character', characterId, {
    onUpdate: (data) => {
      console.log('[useCharacterSync] 캐릭터 업데이트', data)
    },
  })
}

export function useResourcesSync(characterId: string) {
  return useRealtimeSync('resources', characterId, {
    onUpdate: (data) => {
      console.log('[useResourcesSync] 자원 업데이트', data)
    },
  })
}

export function useBattleSync(battleId: string) {
  return useRealtimeSync('battle', battleId, {
    onUpdate: (data) => {
      console.log('[useBattleSync] 배틀 상태 업데이트', data)
    },
  })
}

// 다중 엔티티 동시 구독
export function useMultiEntitySync(subscriptions: Array<{ entity: string; entityId: string }>) {
  const socket = useSocket()
  const [updates, setUpdates] = useState<Map<string, RealTimeUpdate<any>>>(new Map())

  useEffect(() => {
    if (!socket) return

    const handleUpdate = (update: RealTimeUpdate<any>) => {
      const key = `${update.entity}:${update.id}`
      setUpdates((prev) => new Map(prev).set(key, update))
    }

    socket.on('dataUpdate', handleUpdate)

    // 모든 엔티티 구독
    subscriptions.forEach(({ entity, entityId }) => {
      socket.emit('subscribe', { entity, entityId })
    })

    return () => {
      socket.off('dataUpdate', handleUpdate)

      // 모든 구독 해제
      subscriptions.forEach(({ entity, entityId }) => {
        socket.emit('unsubscribe', { entity, entityId })
      })
    }
  }, [socket, subscriptions])

  return updates
}
