import { useState, useCallback, useRef, useEffect } from 'react'

interface CacheItem<T> {
  value: T
  timestamp: number
  ttl: number
}

interface CacheOptions {
  ttl?: number // Time to live in milliseconds
  maxSize?: number // Maximum number of items in cache
}

interface UseCacheReturn<T> {
  get: (key: string) => T | null
  set: (key: string, value: T, ttl?: number) => void
  has: (key: string) => boolean
  delete: (key: string) => void
  clear: () => void
  size: number
  keys: string[]
}

export function useCache<T>(options: CacheOptions = {}): UseCacheReturn<T> {
  const { ttl = 5 * 60 * 1000, maxSize = 100 } = options // 기본 5분 TTL, 최대 100개
  const cacheRef = useRef<Map<string, CacheItem<T>>>(new Map())
  const [, forceUpdate] = useState({})

  // 캐시 정리 (만료된 항목 제거)
  const cleanup = useCallback(() => {
    const now = Date.now()
    for (const [key, item] of cacheRef.current.entries()) {
      if (now - item.timestamp > item.ttl) {
        cacheRef.current.delete(key)
      }
    }
    forceUpdate({})
  }, [])

  // 주기적으로 정리 실행
  useEffect(() => {
    const interval = setInterval(cleanup, 60 * 1000) // 1분마다 정리
    return () => clearInterval(interval)
  }, [cleanup])

  const get = useCallback((key: string): T | null => {
    const item = cacheRef.current.get(key)
    if (!item) return null

    // TTL 확인
    if (Date.now() - item.timestamp > item.ttl) {
      cacheRef.current.delete(key)
      return null
    }

    return item.value
  }, [])

  const set = useCallback(
    (key: string, value: T, customTtl?: number) => {
      // 최대 크기 확인
      if (cacheRef.current.size >= maxSize) {
        // 가장 오래된 항목 제거 (LRU 방식)
        const oldestKey = cacheRef.current.keys().next().value
        if (oldestKey) {
          cacheRef.current.delete(oldestKey)
        }
      }

      cacheRef.current.set(key, {
        value,
        timestamp: Date.now(),
        ttl: customTtl || ttl,
      })

      forceUpdate({})
    },
    [ttl, maxSize]
  )

  const has = useCallback(
    (key: string): boolean => {
      return get(key) !== null
    },
    [get]
  )

  const deleteItem = useCallback((key: string) => {
    cacheRef.current.delete(key)
    forceUpdate({})
  }, [])

  const clear = useCallback(() => {
    cacheRef.current.clear()
    forceUpdate({})
  }, [])

  return {
    get,
    set,
    has,
    delete: deleteItem,
    clear,
    size: cacheRef.current.size,
    keys: Array.from(cacheRef.current.keys()),
  }
}

// API 응답 캐싱 전용 훅
export function useApiCache<T>(options: CacheOptions = {}) {
  const cache = useCache<T>(options)

  const fetchWithCache = useCallback(
    async (key: string, fetcher: () => Promise<T>, customTtl?: number): Promise<T> => {
      // 캐시에서 먼저 확인
      const cached = cache.get(key)
      if (cached !== null) {
        return cached
      }

      // 캐시에 없으면 API 호출
      try {
        const data = await fetcher()
        cache.set(key, data, customTtl)
        return data
      } catch (error) {
        console.error('API fetch failed:', error)
        throw error
      }
    },
    [cache]
  )

  const invalidate = useCallback(
    (key: string) => {
      cache.delete(key)
    },
    [cache]
  )

  const invalidatePattern = useCallback(
    (pattern: RegExp) => {
      cache.keys.forEach((key) => {
        if (pattern.test(key)) {
          cache.delete(key)
        }
      })
    },
    [cache]
  )

  return {
    ...cache,
    fetchWithCache,
    invalidate,
    invalidatePattern,
  }
}

// 게임 데이터 전용 캐싱 훅
export function useGameCache<T>(options: CacheOptions = {}) {
  const defaultOptions = {
    ttl: 10 * 60 * 1000, // 게임 데이터는 10분간 캐시
    maxSize: 50, // 게임 데이터는 최대 50개
    ...options,
  }

  const cache = useCache<T>(defaultOptions)

  // 게임 데이터 전용 메서드들
  const cacheCharacter = useCallback(
    (characterId: string, data: T) => {
      cache.set(`character:${characterId}`, data)
    },
    [cache]
  )

  const getCharacter = useCallback(
    (characterId: string): T | null => {
      return cache.get(`character:${characterId}`)
    },
    [cache]
  )

  const cacheUserResources = useCallback(
    (userId: string, data: T) => {
      cache.set(`resources:${userId}`, data, 2 * 60 * 1000) // 자원은 2분간만 캐시
    },
    [cache]
  )

  const getUserResources = useCallback(
    (userId: string): T | null => {
      return cache.get(`resources:${userId}`)
    },
    [cache]
  )

  const invalidateUserData = useCallback(
    (userId: string) => {
      cache.delete(`character:${userId}`)
      cache.delete(`resources:${userId}`)
    },
    [cache]
  )

  return {
    ...cache,
    cacheCharacter,
    getCharacter,
    cacheUserResources,
    getUserResources,
    invalidateUserData,
  }
}
