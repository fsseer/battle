import { logger } from '../utils/logger'
import { HybridSyncService } from './hybridSync'

export interface ResourceChange {
  type: 'GAIN' | 'LOSS' | 'UPDATE'
  resource: string
  oldValue: number
  newValue: number
  delta: number
  reason: string
  timestamp: Date
}

export interface ResourceThreshold {
  resource: string
  threshold: number
  type: 'ABOVE' | 'BELOW' | 'CHANGE'
}

export class ResourceManager {
  private hybridSync: HybridSyncService
  private changeHistory: Map<string, ResourceChange[]> = new Map()
  private thresholds: Map<string, ResourceThreshold[]> = new Map()
  private lastSync: Map<string, any> = new Map()
  private syncInterval = 5000 // 5초마다 동기화 체크

  constructor(hybridSync: HybridSyncService) {
    this.hybridSync = hybridSync
    this.startSyncChecker()
  }

  // 자원 변경 감지 및 처리
  public updateResource(
    characterId: string,
    resourceType: string,
    newValue: number,
    reason: string = 'update'
  ): ResourceChange | null {
    const key = `${characterId}:${resourceType}`
    const oldValue = this.lastSync.get(key) || 0
    const delta = newValue - oldValue

    // 변경사항이 없는 경우 무시
    if (delta === 0) {
      return null
    }

    const change: ResourceChange = {
      type: delta > 0 ? 'GAIN' : 'LOSS',
      resource: resourceType,
      oldValue,
      newValue,
      delta: Math.abs(delta),
      reason,
      timestamp: new Date(),
    }

    // 변경 이력 저장
    if (!this.changeHistory.has(characterId)) {
      this.changeHistory.set(characterId, [])
    }
    this.changeHistory.get(characterId)!.push(change)

    // 최신 값 업데이트
    this.lastSync.set(key, newValue)

    // 중요한 변경사항인지 확인
    if (this.isSignificantChange(change)) {
      this.notifySignificantChange(characterId, change)
    }

    logger.debug('자원 변경 감지', {
      characterId,
      resourceType,
      oldValue,
      newValue,
      delta,
      reason,
    })

    return change
  }

  // 중요한 변경사항인지 판단
  private isSignificantChange(change: ResourceChange): boolean {
    // 임계값 기반 판단
    const thresholds = this.thresholds.get(change.resource) || []

    for (const threshold of thresholds) {
      if (threshold.type === 'ABOVE' && change.newValue > threshold.threshold) {
        return true
      }
      if (threshold.type === 'BELOW' && change.newValue < threshold.threshold) {
        return true
      }
      if (threshold.type === 'CHANGE' && Math.abs(change.delta) > threshold.threshold) {
        return true
      }
    }

    // 기본 규칙: 큰 변화량 또는 특정 자원
    if (change.resource === 'ap' && change.delta > 10) return true
    if (change.resource === 'gold' && change.delta > 100) return true
    if (change.resource === 'stress' && change.delta > 20) return true
    if (change.resource === 'exp' && change.delta > 50) return true

    return false
  }

  // 중요한 변경사항 알림
  private notifySignificantChange(characterId: string, change: ResourceChange) {
    // 하이브리드 동기화를 통해 즉시 전송
    this.hybridSync.updateResources(characterId, {
      [change.resource]: change.newValue,
      lastChange: change,
      timestamp: new Date().toISOString(),
    })

    logger.info('중요한 자원 변경사항 알림', {
      characterId,
      change,
    })
  }

  // 자원 임계값 설정
  public setThreshold(resource: string, threshold: ResourceThreshold) {
    if (!this.thresholds.has(resource)) {
      this.thresholds.set(resource, [])
    }
    this.thresholds.get(resource)!.push(threshold)
  }

  // 자원 동기화 체커 시작
  private startSyncChecker() {
    setInterval(() => {
      this.performPeriodicSync()
    }, this.syncInterval)
  }

  // 주기적 동기화 수행
  private performPeriodicSync() {
    for (const [key, lastValue] of this.lastSync.entries()) {
      const [characterId, resourceType] = key.split(':')

      // 주기적 동기화는 폴링 기반으로 처리
      // 중요한 변경사항은 이미 이벤트로 전송됨
      logger.debug('주기적 자원 동기화', { characterId, resourceType, value: lastValue })
    }
  }

  // 자원 변경 이력 조회
  public getChangeHistory(
    characterId: string,
    resourceType?: string,
    limit: number = 50
  ): ResourceChange[] {
    const history = this.changeHistory.get(characterId) || []

    if (resourceType) {
      return history.filter((change) => change.resource === resourceType).slice(-limit)
    }

    return history.slice(-limit)
  }

  // 자원 상태 조회
  public getResourceState(characterId: string, resourceType: string): any {
    const key = `${characterId}:${resourceType}`
    const currentValue = this.lastSync.get(key) || 0
    const history = this.getChangeHistory(characterId, resourceType, 10)

    return {
      currentValue,
      lastChange: history[history.length - 1] || null,
      recentChanges: history,
      lastSync: new Date(),
    }
  }

  // 배치 자원 업데이트
  public batchUpdateResources(
    characterId: string,
    updates: Record<string, number>,
    reason: string = 'batch_update'
  ) {
    const changes: ResourceChange[] = []

    for (const [resourceType, newValue] of Object.entries(updates)) {
      const change = this.updateResource(characterId, resourceType, newValue, reason)
      if (change) {
        changes.push(change)
      }
    }

    // 배치 변경사항이 있는 경우 통합 알림
    if (changes.length > 0) {
      this.notifyBatchChange(characterId, changes)
    }

    return changes
  }

  // 배치 변경사항 알림
  private notifyBatchChange(characterId: string, changes: ResourceChange[]) {
    const summary = {
      totalChanges: changes.length,
      resources: changes.reduce((acc, change) => {
        acc[change.resource] = {
          current: change.newValue,
          delta: change.delta,
          type: change.type,
        }
        return acc
      }, {} as Record<string, any>),
      timestamp: new Date().toISOString(),
    }

    this.hybridSync.updateResources(characterId, summary)

    logger.info('배치 자원 변경사항 알림', {
      characterId,
      changesCount: changes.length,
      summary,
    })
  }

  // 자원 소모 처리 (AP, 골드 등)
  public consumeResource(
    characterId: string,
    resourceType: string,
    amount: number,
    reason: string = 'consumption'
  ): boolean {
    const key = `${characterId}:${resourceType}`
    const currentValue = this.lastSync.get(key) || 0

    if (currentValue < amount) {
      logger.warn('자원 부족', {
        characterId,
        resourceType,
        required: amount,
        available: currentValue,
      })
      return false
    }

    const newValue = currentValue - amount
    this.updateResource(characterId, resourceType, newValue, reason)

    return true
  }

  // 자원 획득 처리
  public gainResource(
    characterId: string,
    resourceType: string,
    amount: number,
    reason: string = 'gain'
  ): void {
    const key = `${characterId}:${resourceType}`
    const currentValue = this.lastSync.get(key) || 0
    const newValue = currentValue + amount

    this.updateResource(characterId, resourceType, newValue, reason)
  }

  // 통계 정보
  public getStats() {
    const stats = {
      totalCharacters: new Set([...this.lastSync.keys()].map((key) => key.split(':')[0])).size,
      totalResources: this.lastSync.size,
      totalChanges: 0,
      activeThresholds: 0,
    }

    for (const history of this.changeHistory.values()) {
      stats.totalChanges += history.length
    }

    for (const thresholds of this.thresholds.values()) {
      stats.activeThresholds += thresholds.length
    }

    return stats
  }
}
