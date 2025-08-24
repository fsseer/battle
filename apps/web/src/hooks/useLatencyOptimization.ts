import { useState, useEffect, useRef, useCallback } from 'react'
import { useSocket } from './useSocket'

export interface LatencyInfo {
  current: number
  average: number
  min: number
  max: number
  samples: number[]
  quality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR'
}

export interface OptimizationStrategy {
  updateFrequency: number // 업데이트 빈도 (ms)
  batchSize: number // 배치 크기
  compressionLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH'
  predictionEnabled: boolean // 예측 업데이트 활성화
}

export function useLatencyOptimization() {
  const socket = useSocket()
  const [latencyInfo, setLatencyInfo] = useState<LatencyInfo>({
    current: 0,
    average: 0,
    min: Infinity,
    max: 0,
    samples: [],
    quality: 'GOOD',
  })

  const [strategy, setStrategy] = useState<OptimizationStrategy>({
    updateFrequency: 100,
    batchSize: 5,
    compressionLevel: 'MEDIUM',
    predictionEnabled: true,
  })

  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastPingTimeRef = useRef<number>(0)
  const latencyHistoryRef = useRef<number[]>([])

  // 핑 전송 및 레이턴시 측정
  const measureLatency = useCallback((): Promise<number> => {
    return new Promise((resolve) => {
      if (!socket?.connected) {
        resolve(-1)
        return
      }

      const startTime = Date.now()
      lastPingTimeRef.current = startTime

      // 핑 이벤트 전송
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
        resolve(-1)
      }, 5000)
    })
  }, [socket])

  // 레이턴시 품질 평가
  const evaluateLatencyQuality = useCallback((latency: number): LatencyInfo['quality'] => {
    if (latency < 50) return 'EXCELLENT'
    if (latency < 100) return 'GOOD'
    if (latency < 200) return 'FAIR'
    return 'POOR'
  }, [])

  // 최적화 전략 조정
  const adjustStrategy = useCallback((latency: number) => {
    let newStrategy: OptimizationStrategy

    if (latency < 50) {
      // 낮은 레이턴시: 실시간 최적화
      newStrategy = {
        updateFrequency: 16, // 60fps
        batchSize: 1,
        compressionLevel: 'NONE',
        predictionEnabled: true,
      }
    } else if (latency < 100) {
      // 중간 레이턴시: 균형잡힌 최적화
      newStrategy = {
        updateFrequency: 50, // 20fps
        batchSize: 3,
        compressionLevel: 'LOW',
        predictionEnabled: true,
      }
    } else if (latency < 200) {
      // 높은 레이턴시: 보수적 최적화
      newStrategy = {
        updateFrequency: 100, // 10fps
        batchSize: 5,
        compressionLevel: 'MEDIUM',
        predictionEnabled: false,
      }
    } else {
      // 매우 높은 레이턴시: 최대 최적화
      newStrategy = {
        updateFrequency: 200, // 5fps
        batchSize: 10,
        compressionLevel: 'HIGH',
        predictionEnabled: false,
      }
    }

    setStrategy(newStrategy)
    return newStrategy
  }, [])

  // 레이턴시 측정 및 전략 조정
  const updateLatency = useCallback(async () => {
    const latency = await measureLatency()

    if (latency > 0) {
      const newSamples = [...latencyHistoryRef.current, latency].slice(-10) // 최근 10개 샘플
      const average = newSamples.reduce((sum, val) => sum + val, 0) / newSamples.length
      const min = Math.min(...newSamples)
      const max = Math.max(...newSamples)
      const quality = evaluateLatencyQuality(latency)

      const newLatencyInfo: LatencyInfo = {
        current: latency,
        average,
        min,
        max,
        samples: newSamples,
        quality,
      }

      setLatencyInfo(newLatencyInfo)
      latencyHistoryRef.current = newSamples

      // 전략 조정
      adjustStrategy(latency)

      console.log('[useLatencyOptimization] 레이턴시 업데이트', {
        latency,
        quality,
        strategy: adjustStrategy(latency),
      })
    }
  }, [measureLatency, adjustStrategy, evaluateLatencyQuality])

  // 주기적 레이턴시 측정 시작
  useEffect(() => {
    if (socket?.connected) {
      // 초기 측정
      updateLatency()

      // 주기적 측정 (5초마다)
      pingIntervalRef.current = setInterval(updateLatency, 5000)

      return () => {
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current)
        }
      }
    }
  }, [socket?.connected, updateLatency])

  // 예측 업데이트 (레이턴시 보정)
  const predictUpdate = useCallback(
    (lastKnownValue: number, lastUpdateTime: number) => {
      if (!strategy.predictionEnabled) return lastKnownValue

      const now = Date.now()
      const timeDiff = now - lastUpdateTime
      const predictedLatency = latencyInfo.current

      // 예측값 계산 (간단한 선형 보간)
      return lastKnownValue + timeDiff * 0.001 // 1ms당 0.001 증가 가정
    },
    [strategy.predictionEnabled, latencyInfo.current]
  )

  // 배치 업데이트 처리
  const processBatchUpdate = useCallback(
    (updates: any[]) => {
      if (updates.length === 0) return

      // 배치 크기에 따라 그룹화
      const batches = []
      for (let i = 0; i < updates.length; i += strategy.batchSize) {
        batches.push(updates.slice(i, i + strategy.batchSize))
      }

      // 각 배치를 지정된 간격으로 처리
      batches.forEach((batch, index) => {
        setTimeout(() => {
          // 배치 처리 로직
          console.log(`[useLatencyOptimization] 배치 ${index + 1} 처리`, batch)
        }, index * strategy.updateFrequency)
      })
    },
    [strategy.batchSize, strategy.updateFrequency]
  )

  // 데이터 압축
  const compressData = useCallback((data: any, level: OptimizationStrategy['compressionLevel']) => {
    switch (level) {
      case 'NONE':
        return data
      case 'LOW':
        // 기본 압축: null/undefined 제거
        return Object.fromEntries(Object.entries(data).filter(([_, value]) => value != null))
      case 'MEDIUM':
        // 중간 압축: 기본값과 같은 값 제거
        return Object.fromEntries(
          Object.entries(data).filter(([_, value]) => {
            if (typeof value === 'number') return value !== 0
            if (typeof value === 'string') return value !== ''
            if (typeof value === 'boolean') return value !== false
            return value != null
          })
        )
      case 'HIGH':
        // 높은 압축: 변경사항만 포함
        return data
      default:
        return data
    }
  }, [])

  // 연결 품질 모니터링
  const getConnectionQuality = useCallback(() => {
    const { quality, current, average } = latencyInfo

    return {
      quality,
      latency: current,
      averageLatency: average,
      isStable: Math.abs(current - average) < 20, // 20ms 이내 변동
      recommendation: getRecommendation(quality, current),
    }
  }, [latencyInfo])

  const getRecommendation = (quality: LatencyInfo['quality'], latency: number) => {
    switch (quality) {
      case 'EXCELLENT':
        return '최적의 게임 환경입니다.'
      case 'GOOD':
        return '안정적인 게임이 가능합니다.'
      case 'FAIR':
        return '게임 플레이에 약간의 지연이 있을 수 있습니다.'
      case 'POOR':
        return '네트워크 상태를 확인해주세요.'
      default:
        return '연결 상태를 확인 중입니다.'
    }
  }

  return {
    latencyInfo,
    strategy,
    measureLatency,
    predictUpdate,
    processBatchUpdate,
    compressData,
    getConnectionQuality,
    updateLatency,
  }
}
