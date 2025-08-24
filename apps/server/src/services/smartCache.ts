import { logger } from '../utils/logger'

export interface CacheEntry<T = any> {
  data: T
  timestamp: number
  ttl: number
  version: number
  lastAccessed: number
  accessCount: number
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface CacheConfig {
  maxSize: number
  defaultTTL: number
  cleanupInterval: number
  enableCompression: boolean
  enableStats: boolean
}

export class SmartCache {
  private cache: Map<string, CacheEntry> = new Map()
  private config: CacheConfig
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    compressions: 0,
  }

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 300000, // 5분
      cleanupInterval: 60000, // 1분
      enableCompression: true,
      enableStats: true,
      ...config,
    }

    this.startCleanup()
  }

  // 캐시 설정
  public set<T>(
    key: string,
    data: T,
    options: {
      ttl?: number
      priority?: CacheEntry['priority']
      version?: number
    } = {}
  ): void {
    const { ttl = this.config.defaultTTL, priority = 'MEDIUM', version = 1 } = options

    // 캐시 크기 제한 확인
    if (this.cache.size >= this.config.maxSize) {
      this.evictLowPriorityEntries()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      version,
      lastAccessed: Date.now(),
      accessCount: 0,
      priority,
    }

    this.cache.set(key, entry)
    this.stats.sets++

    logger.debug('캐시 항목 설정', { key, priority, ttl, cacheSize: this.cache.size })
  }

  // 캐시 조회
  public get<T>(key: string): T | null {
    const entry = this.cache.get(key)

    if (!entry) {
      this.stats.misses++
      return null
    }

    // TTL 확인
    if (this.isExpired(entry)) {
      this.cache.delete(key)
      this.stats.misses++
      return null
    }

    // 접근 통계 업데이트
    entry.lastAccessed = Date.now()
    entry.accessCount++

    this.stats.hits++
    return entry.data
  }

  // 캐시 항목 존재 여부 확인
  public has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    if (this.isExpired(entry)) {
      this.cache.delete(key)
      return false
    }

    return true
  }

  // 캐시 항목 삭제
  public delete(key: string): boolean {
    const deleted = this.cache.delete(key)
    if (deleted) {
      this.stats.deletes++
    }
    return deleted
  }

  // 캐시 무효화 (버전 기반)
  public invalidate(key: string, newVersion?: number): void {
    const entry = this.cache.get(key)
    if (entry) {
      if (newVersion) {
        entry.version = newVersion
        entry.timestamp = Date.now()
        logger.debug('캐시 버전 업데이트', { key, newVersion })
      } else {
        this.cache.delete(key)
        logger.debug('캐시 무효화', { key })
      }
    }
  }

  // 우선순위 기반 캐시 항목 제거
  private evictLowPriorityEntries(): void {
    const entries = Array.from(this.cache.entries())

    // 우선순위가 낮고 오래된 항목부터 정렬
    entries.sort((a, b) => {
      const priorityOrder = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 }
      const priorityDiff = priorityOrder[a[1].priority] - priorityOrder[b[1].priority]

      if (priorityDiff !== 0) return priorityDiff

      return a[1].lastAccessed - b[1].lastAccessed
    })

    // 낮은 우선순위 항목들을 제거
    const toRemove = Math.ceil(this.config.maxSize * 0.1) // 10% 제거
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0])
    }

    logger.debug('낮은 우선순위 캐시 항목 제거', { removed: toRemove })
  }

  // 만료된 항목 확인
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }

  // 정리 작업 시작
  private startCleanup(): void {
    setInterval(() => {
      this.cleanup()
    }, this.config.cleanupInterval)
  }

  // 만료된 항목 정리
  private cleanup(): void {
    const beforeSize = this.cache.size
    const now = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key)
      }
    }

    const afterSize = this.cache.size
    if (beforeSize !== afterSize) {
      logger.debug('캐시 정리 완료', {
        before: beforeSize,
        after: afterSize,
        removed: beforeSize - afterSize,
      })
    }
  }

  // 데이터 압축 (간단한 압축)
  public compressData(data: any): any {
    if (!this.config.enableCompression) return data

    if (typeof data === 'object' && data !== null) {
      const compressed: any = {}

      for (const [key, value] of Object.entries(data)) {
        if (value !== null && value !== undefined && value !== '') {
          if (typeof value === 'number' && value === 0) continue
          if (typeof value === 'boolean' && value === false) continue

          compressed[key] = value
        }
      }

      this.stats.compressions++
      return compressed
    }

    return data
  }

  // 캐시 통계
  public getStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100
        : 0

    return {
      ...this.stats,
      hitRate: hitRate.toFixed(2) + '%',
      cacheSize: this.cache.size,
      maxSize: this.config.maxSize,
      utilization: ((this.cache.size / this.config.maxSize) * 100).toFixed(2) + '%',
    }
  }

  // 캐시 상태 정보
  public getCacheInfo(): any {
    const priorityCounts = { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 }
    const totalTTL = 0

    for (const entry of this.cache.values()) {
      priorityCounts[entry.priority]++
    }

    return {
      totalEntries: this.cache.size,
      priorityDistribution: priorityCounts,
      averageTTL: totalTTL / this.cache.size || 0,
      oldestEntry: Math.min(...Array.from(this.cache.values()).map((e) => e.timestamp)),
      newestEntry: Math.max(...Array.from(this.cache.values()).map((e) => e.timestamp)),
    }
  }

  // 캐시 완전 비우기
  public clear(): void {
    const size = this.cache.size
    this.cache.clear()
    logger.info('캐시 완전 비우기', { clearedEntries: size })
  }

  // 특정 패턴의 키들 삭제
  public deletePattern(pattern: RegExp): number {
    let deleted = 0

    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key)
        deleted++
      }
    }

    logger.debug('패턴 기반 캐시 삭제', { pattern: pattern.toString(), deleted })
    return deleted
  }
}
