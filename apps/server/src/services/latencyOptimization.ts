import { logger } from '../utils/logger'
import { RealtimeSyncService } from './realtimeSync'

export class LatencyOptimizationService {
  private realtimeSync: RealtimeSyncService
  private updateQueue: Map<string, Array<{ data: any; timestamp: number }>> = new Map()
  private batchSize = 10
  private batchInterval = 50 // 50ms 배치 처리

  constructor(realtimeSync: RealtimeSyncService) {
    this.realtimeSync = realtimeSync
    this.startBatchProcessor()
  }

  // 업데이트를 큐에 추가 (배치 처리)
  public queueUpdate(entity: string, entityId: string, data: any) {
    const key = `${entity}:${entityId}`

    if (!this.updateQueue.has(key)) {
      this.updateQueue.set(key, [])
    }

    const queue = this.updateQueue.get(key)!
    queue.push({
      data,
      timestamp: Date.now(),
    })

    // 큐가 가득 찬 경우 즉시 처리
    if (queue.length >= this.batchSize) {
      this.processQueue(key)
    }
  }

  // 즉시 업데이트 (긴급한 경우)
  public immediateUpdate(entity: string, entityId: string, data: any) {
    this.realtimeSync.broadcastUpdate(entity, entityId, 'UPDATE', data)
    logger.debug('즉시 업데이트 실행', { entity, entityId })
  }

  // 큐 처리
  private processQueue(key: string) {
    const queue = this.updateQueue.get(key)
    if (!queue || queue.length === 0) return

    // 가장 최신 데이터만 사용 (중간 업데이트는 무시)
    const latestUpdate = queue[queue.length - 1]
    const [entity, entityId] = key.split(':')

    // 배치 처리된 업데이트 전송
    this.realtimeSync.broadcastUpdate(entity, entityId, 'UPDATE', latestUpdate.data)

    // 큐 비우기
    queue.length = 0

    logger.debug('배치 업데이트 처리', {
      entity,
      entityId,
      processedCount: queue.length,
      finalData: latestUpdate.data,
    })
  }

  // 배치 프로세서 시작
  private startBatchProcessor() {
    setInterval(() => {
      for (const [key, queue] of this.updateQueue.entries()) {
        if (queue.length > 0) {
          this.processQueue(key)
        }
      }
    }, this.batchInterval)
  }

  // 게임 상태 압축 (중요한 변경사항만 전송)
  public compressGameState(currentState: any, previousState: any): any {
    const compressed: any = {}
    let hasChanges = false

    // 스탯 변경사항만 압축
    if (currentState.stats && previousState.stats) {
      const statChanges: any = {}
      for (const [key, value] of Object.entries(currentState.stats)) {
        if (previousState.stats[key] !== value) {
          statChanges[key] = value
          hasChanges = true
        }
      }
      if (hasChanges) {
        compressed.stats = statChanges
      }
    }

    // 자원 변경사항만 압축
    if (currentState.resources && previousState.resources) {
      const resourceChanges: any = {}
      for (const [key, value] of Object.entries(currentState.resources)) {
        if (previousState.resources[key] !== value) {
          resourceChanges[key] = value
          hasChanges = true
        }
      }
      if (hasChanges) {
        compressed.resources = resourceChanges
      }
    }

    return hasChanges ? compressed : null
  }

  // 우선순위 기반 업데이트
  public priorityUpdate(
    entity: string,
    entityId: string,
    data: any,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ) {
    switch (priority) {
      case 'CRITICAL':
        // 즉시 전송 (배틀 결과, 생명력 등)
        this.immediateUpdate(entity, entityId, data)
        break
      case 'HIGH':
        // 짧은 지연 후 전송 (스킬 사용, 아이템 사용 등)
        setTimeout(() => {
          this.immediateUpdate(entity, entityId, data)
        }, 10)
        break
      case 'MEDIUM':
        // 배치 처리 (스탯 변화, 경험치 등)
        this.queueUpdate(entity, entityId, data)
        break
      case 'LOW':
        // 긴 배치 처리 (UI 업데이트, 로그 등)
        this.queueUpdate(entity, entityId, data)
        break
    }
  }

  // 레이턴시 측정
  public measureLatency(socketId: string): Promise<number> {
    return new Promise((resolve) => {
      const startTime = Date.now()

      // 핑 요청 전송
      const socket = this.realtimeSync['io'].sockets.sockets.get(socketId)
      if (socket) {
        socket.emit('ping', { timestamp: startTime })

        // 핑 응답 대기
        const pingHandler = (data: { timestamp: number }) => {
          const latency = Date.now() - data.timestamp
          socket.off('pong', pingHandler)
          resolve(latency)
        }

        socket.on('pong', pingHandler)

        // 타임아웃 처리
        setTimeout(() => {
          socket.off('pong', pingHandler)
          resolve(-1) // 타임아웃
        }, 5000)
      } else {
        resolve(-1)
      }
    })
  }

  // 연결 품질에 따른 업데이트 전략 조정
  public adjustUpdateStrategy(socketId: string, latency: number) {
    if (latency < 50) {
      // 낮은 레이턴시: 실시간 업데이트
      return { batchSize: 1, batchInterval: 0 }
    } else if (latency < 150) {
      // 중간 레이턴시: 작은 배치
      return { batchSize: 5, batchInterval: 25 }
    } else {
      // 높은 레이턴시: 큰 배치
      return { batchSize: 20, batchInterval: 100 }
    }
  }

  // 통계 정보
  public getStats() {
    const stats = {
      totalQueuedUpdates: 0,
      averageQueueSize: 0,
      batchProcessed: 0,
    }

    for (const queue of this.updateQueue.values()) {
      stats.totalQueuedUpdates += queue.length
    }

    if (this.updateQueue.size > 0) {
      stats.averageQueueSize = stats.totalQueuedUpdates / this.updateQueue.size
    }

    return stats
  }
}
