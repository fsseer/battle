import { useEffect, useState, useCallback } from 'react'
import { socket } from '../lib/socket'

export interface LatencyInfo {
  current: number
  average: number
  min: number
  max: number
  samples: number
}

export function useLatencyOptimization() {
  const [latencyInfo, setLatencyInfo] = useState<LatencyInfo>({
    current: 0,
    average: 0,
    min: 0,
    max: 0,
    samples: 0
  })

  const [isOptimizing, setIsOptimizing] = useState(false)

  // 지연시간 측정
  const measureLatency = useCallback(() => {
    if (!socket?.connected) return

    const startTime = Date.now()
    
    socket.emit('ping', { timestamp: startTime }, () => {
      const endTime = Date.now()
      const latency = endTime - startTime
      
      setLatencyInfo(prev => {
        const newSamples = prev.samples + 1
        const newAverage = (prev.average * prev.samples + latency) / newSamples
        const newMin = prev.min === 0 ? latency : Math.min(prev.min, latency)
        const newMax = Math.max(prev.max, latency)
        
        return {
          current: latency,
          average: newAverage,
          min: newMin,
          max: newMax,
          samples: newSamples
        }
      })
    })
  }, [])

  // 최적화 시작
  const startOptimization = useCallback(() => {
    setIsOptimizing(true)
    measureLatency()
  }, [measureLatency])

  // 최적화 중지
  const stopOptimization = useCallback(() => {
    setIsOptimizing(false)
  }, [])

  // 자동 최적화
  useEffect(() => {
    if (!isOptimizing) return

    const interval = setInterval(measureLatency, 1000)
    return () => clearInterval(interval)
  }, [isOptimizing, measureLatency])

  // 권장사항 계산
  const getRecommendation = useCallback(() => {
    if (latencyInfo.average < 50) {
      return '최적 상태입니다'
    } else if (latencyInfo.average < 100) {
      return '양호한 상태입니다'
    } else if (latencyInfo.average < 200) {
      return '개선이 필요합니다'
    } else {
      return '심각한 지연이 발생하고 있습니다'
    }
  }, [latencyInfo.average])

  return {
    latencyInfo,
    isOptimizing,
    startOptimization,
    stopOptimization,
    measureLatency,
    getRecommendation
  }
}
