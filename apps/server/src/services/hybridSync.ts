import { Server } from 'socket.io'
import { logger } from '../utils/logger'
import { RealTimeUpdate } from '../types/api'

export interface SyncStrategy {
  type: 'REALTIME' | 'POLLING' | 'EVENT_DRIVEN'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  updateInterval?: number // 폴링 간격 (ms)
  batchSize?: number // 배치 크기
}

export class HybridSyncService {
  private io: Server
  private strategies: Map<string, SyncStrategy> = new Map()
  private subscriptions: Map<string, Set<string>> = new Map()
  private eventQueue: Map<string, Array<{ data: any; timestamp: number }>> = new Map()
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map()

  constructor(io: Server) {
    this.io = io
    this.setupDefaultStrategies()
    this.setupSocketHandlers()
    this.startEventProcessor()
  }

  // 기본 동기화 전략 설정
  private setupDefaultStrategies() {
    // 전투 관련: 실시간 (빠른 응답 필요)
    this.strategies.set('battle', {
      type: 'REALTIME',
      priority: 'CRITICAL',
      batchSize: 1,
    })

    // 자원 관련: 이벤트 기반 (중요한 변경사항만)
    this.strategies.set('resources', {
      type: 'EVENT_DRIVEN',
      priority: 'HIGH',
      batchSize: 5,
    })

    // 캐릭터 스탯: 폴링 기반 (자주 변경되지 않음)
    this.strategies.set('character', {
      type: 'POLLING',
      priority: 'MEDIUM',
      updateInterval: 30000, // 30초
      batchSize: 10,
    })

    // 일반 게임 상태: 폴링 기반 (트래픽 최소화)
    this.strategies.set('gameState', {
      type: 'POLLING',
      priority: 'LOW',
      updateInterval: 60000, // 1분
      batchSize: 20,
    })

    // 훈련 결과: 이벤트 기반 (즉시 전송 필요)
    this.strategies.set('training', {
      type: 'EVENT_DRIVEN',
      priority: 'HIGH',
      batchSize: 1,
    })
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      logger.info('새로운 웹소켓 연결', { socketId: socket.id })

      // 구독 요청 처리
      socket.on('subscribe', (data: { entity: string; entityId: string }) => {
        this.subscribe(socket.id, data.entity, data.entityId)
      })

      // 구독 해제 요청 처리
      socket.on('unsubscribe', (data: { entity: string; entityId: string }) => {
        this.unsubscribe(socket.id, data.entity, data.entityId)
      })

      // 연결 해제 시 구독 정리
      socket.on('disconnect', () => {
        this.cleanupSocket(socket.id)
      })
    })
  }

  // 구독 추가
  private subscribe(socketId: string, entity: string, entityId: string) {
    const key = `${entity}:${entityId}`

    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set())
    }
    this.subscriptions.get(key)!.add(socketId)

    // 폴링 기반 엔티티인 경우 타이머 시작
    const strategy = this.strategies.get(entity)
    if (strategy?.type === 'POLLING' && strategy.updateInterval) {
      this.startPolling(entity, entityId, strategy.updateInterval)
    }

    logger.debug('구독 추가됨', { socketId, entity, entityId, strategy: strategy?.type })
  }

  // 구독 해제
  private unsubscribe(socketId: string, entity: string, entityId: string) {
    const key = `${entity}:${entityId}`

    const entitySubscribers = this.subscriptions.get(key)
    if (entitySubscribers) {
      entitySubscribers.delete(socketId)
      if (entitySubscribers.size === 0) {
        this.subscriptions.delete(key)

        // 폴링 타이머 정리
        this.stopPolling(entity, entityId)
      }
    }

    logger.debug('구독 해제됨', { socketId, entity, entityId })
  }

  // 소켓 정리
  private cleanupSocket(socketId: string) {
    for (const [key, subscribers] of this.subscriptions.entries()) {
      if (subscribers.has(socketId)) {
        subscribers.delete(socketId)
        if (subscribers.size === 0) {
          this.subscriptions.delete(key)
          const [entity, entityId] = key.split(':')
          this.stopPolling(entity, entityId)
        }
      }
    }

    logger.info('웹소켓 연결 해제 및 구독 정리', { socketId })
  }

  // 폴링 시작
  private startPolling(entity: string, entityId: string, interval: number) {
    const key = `${entity}:${entityId}`

    if (this.pollingTimers.has(key)) {
      return // 이미 실행 중
    }

    const timer = setInterval(() => {
      this.processPollingUpdate(entity, entityId)
    }, interval)

    this.pollingTimers.set(key, timer)
    logger.debug('폴링 시작', { entity, entityId, interval })
  }

  // 폴링 정지
  private stopPolling(entity: string, entityId: string) {
    const key = `${entity}:${entityId}`
    const timer = this.pollingTimers.get(key)

    if (timer) {
      clearInterval(timer)
      this.pollingTimers.delete(key)
      logger.debug('폴링 정지', { entity, entityId })
    }
  }

  // 폴링 업데이트 처리
  private processPollingUpdate(entity: string, entityId: string) {
    const key = `${entity}:${entityId}`
    const subscribers = this.subscriptions.get(key)

    if (!subscribers || subscribers.size === 0) {
      this.stopPolling(entity, entityId)
      return
    }

    // 폴링 기반 업데이트는 배치로 처리
    this.queueUpdate(entity, entityId, { type: 'polling', timestamp: Date.now() })
  }

  // 업데이트 큐에 추가
  private queueUpdate(entity: string, entityId: string, data: any) {
    const key = `${entity}:${entityId}`

    if (!this.eventQueue.has(key)) {
      this.eventQueue.set(key, [])
    }

    const queue = this.eventQueue.get(key)!
    queue.push({
      data,
      timestamp: Date.now(),
    })

    // 실시간 업데이트는 즉시 처리
    const strategy = this.strategies.get(entity)
    if (strategy?.type === 'REALTIME') {
      this.processUpdate(entity, entityId, data)
    }
  }

  // 이벤트 프로세서 시작
  private startEventProcessor() {
    setInterval(() => {
      for (const [key, queue] of this.eventQueue.entries()) {
        if (queue.length > 0) {
          const [entity, entityId] = key.split(':')
          const strategy = this.strategies.get(entity)

          if (strategy?.type === 'EVENT_DRIVEN') {
            // 이벤트 기반: 배치 처리
            this.processBatchUpdate(entity, entityId, queue)
          }
        }
      }
    }, 100) // 100ms마다 처리
  }

  // 배치 업데이트 처리
  private processBatchUpdate(
    entity: string,
    entityId: string,
    queue: Array<{ data: any; timestamp: number }>
  ) {
    const strategy = this.strategies.get(entity)
    const batchSize = strategy?.batchSize || 10

    if (queue.length >= batchSize) {
      const batch = queue.splice(0, batchSize)
      const latestData = batch[batch.length - 1].data

      this.processUpdate(entity, entityId, latestData)

      logger.debug('배치 업데이트 처리', {
        entity,
        entityId,
        batchSize: batch.length,
        remaining: queue.length,
      })
    }
  }

  // 업데이트 처리 및 전송
  private processUpdate(entity: string, entityId: string, data: any) {
    const key = `${entity}:${entityId}`
    const subscribers = this.subscriptions.get(key)

    if (!subscribers || subscribers.size === 0) return

    const update: RealTimeUpdate<any> = {
      type: 'UPDATE',
      entity,
      id: entityId,
      data,
      timestamp: new Date().toISOString(),
      version: Date.now(),
    }

    // 구독자들에게 업데이트 전송
    for (const socketId of subscribers) {
      const socket = this.io.sockets.sockets.get(socketId)
      if (socket) {
        socket.emit('dataUpdate', update)
      }
    }

    logger.debug('업데이트 전송', {
      entity,
      entityId,
      subscribersCount: subscribers.size,
      strategy: this.strategies.get(entity)?.type,
    })
  }

  // 자원 변경사항 즉시 전송 (중요한 변경사항)
  public updateResources(characterId: string, resources: any) {
    this.queueUpdate('resources', characterId, resources)
  }

  // 훈련 결과 즉시 전송
  public updateTrainingResult(characterId: string, result: any) {
    this.queueUpdate('training', characterId, result)
  }

  // 전투 상태 실시간 업데이트
  public updateBattleState(battleId: string, battleState: any) {
    this.processUpdate('battle', battleId, battleState)
  }

  // 캐릭터 스탯 폴링 업데이트
  public updateCharacterStats(characterId: string, stats: any) {
    this.queueUpdate('character', characterId, stats)
  }

  // 전략 동적 변경
  public updateStrategy(entity: string, newStrategy: Partial<SyncStrategy>) {
    const current = this.strategies.get(entity)
    if (current) {
      this.strategies.set(entity, { ...current, ...newStrategy })
      logger.info('동기화 전략 업데이트', { entity, newStrategy })
    }
  }

  // 통계 정보
  public getStats() {
    const stats = {
      totalSubscriptions: 0,
      totalSockets: 0,
      entityCounts: new Map<string, number>(),
      strategyCounts: new Map<string, number>(),
      activePolling: this.pollingTimers.size,
      queuedUpdates: 0,
    }

    for (const [key, subscribers] of this.subscriptions.entries()) {
      const entity = key.split(':')[0]
      const current = stats.entityCounts.get(entity) || 0
      stats.entityCounts.set(entity, current + subscribers.size)
      stats.totalSubscriptions += subscribers.size
    }

    for (const strategy of this.strategies.values()) {
      const current = stats.strategyCounts.get(strategy.type) || 0
      stats.strategyCounts.set(strategy.type, current + 1)
    }

    for (const queue of this.eventQueue.values()) {
      stats.queuedUpdates += queue.length
    }

    return stats
  }
}
