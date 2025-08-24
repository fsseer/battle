import { Server } from 'socket.io'
import { logger } from '../utils/logger'
import { RealTimeUpdate } from '../types/api'

export class RealtimeSyncService {
  private io: Server
  private subscriptions: Map<string, Set<string>> = new Map() // entity -> socketIds
  private socketSubscriptions: Map<string, Set<string>> = new Map() // socketId -> entities

  constructor(io: Server) {
    this.io = io
    this.setupSocketHandlers()
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

    // 구독 맵에 추가
    if (!this.subscriptions.has(key)) {
      this.subscriptions.set(key, new Set())
    }
    this.subscriptions.get(key)!.add(socketId)

    // 소켓 구독 맵에 추가
    if (!this.socketSubscriptions.has(socketId)) {
      this.socketSubscriptions.set(socketId, new Set())
    }
    this.socketSubscriptions.get(socketId)!.add(key)

    logger.debug('구독 추가됨', { socketId, entity, entityId })
  }

  // 구독 해제
  private unsubscribe(socketId: string, entity: string, entityId: string) {
    const key = `${entity}:${entityId}`

    // 구독 맵에서 제거
    const entitySubscribers = this.subscriptions.get(key)
    if (entitySubscribers) {
      entitySubscribers.delete(socketId)
      if (entitySubscribers.size === 0) {
        this.subscriptions.delete(key)
      }
    }

    // 소켓 구독 맵에서 제거
    const socketSubs = this.socketSubscriptions.get(socketId)
    if (socketSubs) {
      socketSubs.delete(key)
    }

    logger.debug('구독 해제됨', { socketId, entity, entityId })
  }

  // 소켓 정리
  private cleanupSocket(socketId: string) {
    const socketSubs = this.socketSubscriptions.get(socketId)
    if (socketSubs) {
      // 모든 구독에서 제거
      for (const key of socketSubs) {
        const entitySubscribers = this.subscriptions.get(key)
        if (entitySubscribers) {
          entitySubscribers.delete(socketId)
          if (entitySubscribers.size === 0) {
            this.subscriptions.delete(key)
          }
        }
      }
      this.socketSubscriptions.delete(socketId)
    }

    logger.info('웹소켓 연결 해제 및 구독 정리', { socketId })
  }

  // 실시간 업데이트 브로드캐스트
  public broadcastUpdate<T>(
    entity: string,
    entityId: string,
    type: RealTimeUpdate<T>['type'],
    data: T
  ) {
    const key = `${entity}:${entityId}`
    const subscribers = this.subscriptions.get(key)

    if (!subscribers || subscribers.size === 0) {
      return
    }

    const update: RealTimeUpdate<T> = {
      type,
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

    logger.debug('실시간 업데이트 브로드캐스트', {
      entity,
      entityId,
      type,
      subscribersCount: subscribers.size,
    })
  }

  // 특정 소켓에만 업데이트 전송
  public sendUpdateToSocket<T>(
    socketId: string,
    entity: string,
    entityId: string,
    type: RealTimeUpdate<T>['type'],
    data: T
  ) {
    const update: RealTimeUpdate<T> = {
      type,
      entity,
      id: entityId,
      data,
      timestamp: new Date().toISOString(),
      version: Date.now(),
    }

    const socket = this.io.sockets.sockets.get(socketId)
    if (socket) {
      socket.emit('dataUpdate', update)
      logger.debug('특정 소켓에 업데이트 전송', { socketId, entity, entityId, type })
    }
  }

  // 게임 상태 동기화
  public syncGameState(socketId: string, gameState: any) {
    const socket = this.io.sockets.sockets.get(socketId)
    if (socket) {
      socket.emit('gameStateSync', {
        ...gameState,
        timestamp: new Date().toISOString(),
        serverTime: Date.now(),
      })
    }
  }

  // 배틀 상태 업데이트
  public updateBattleState(battleId: string, battleState: any) {
    this.broadcastUpdate('battle', battleId, 'UPDATE', battleState)
  }

  // 캐릭터 상태 업데이트
  public updateCharacterState(characterId: string, characterState: any) {
    this.broadcastUpdate('character', characterId, 'UPDATE', characterState)
  }

  // 자원 업데이트
  public updateResources(characterId: string, resources: any) {
    this.broadcastUpdate('resources', characterId, 'UPDATE', resources)
  }

  // 구독 통계
  public getSubscriptionStats() {
    const stats = {
      totalSubscriptions: 0,
      totalSockets: this.socketSubscriptions.size,
      entityCounts: new Map<string, number>(),
    }

    for (const [key, subscribers] of this.subscriptions) {
      const entity = key.split(':')[0]
      const current = stats.entityCounts.get(entity) || 0
      stats.entityCounts.set(entity, current + subscribers.size)
      stats.totalSubscriptions += subscribers.size
    }

    return stats
  }
}
