import { useState, useEffect, useRef, useCallback } from 'react'

export interface PerformanceMetrics {
  fps: number
  renderTime: number
  memoryUsage: number | null
  componentCount: number
  lastUpdate: number
}

export interface PerformanceConfig {
  enableFPSMonitoring?: boolean
  enableMemoryMonitoring?: boolean
  enableRenderTimeMonitoring?: boolean
  updateInterval?: number
  fpsThreshold?: number
  memoryThreshold?: number
  renderTimeThreshold?: number
}

/**
 * 가로형 레이아웃 성능 모니터링 훅
 */
export function usePerformanceMonitor(config: PerformanceConfig = {}) {
  const {
    enableFPSMonitoring = true,
    enableMemoryMonitoring = true,
    enableRenderTimeMonitoring = true,
    updateInterval = 1000,
    fpsThreshold = 30,
    memoryThreshold = 50 * 1024 * 1024, // 50MB
    renderTimeThreshold = 16, // 16ms (60fps 기준)
  } = config

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 0,
    renderTime: 0,
    memoryUsage: null,
    componentCount: 0,
    lastUpdate: Date.now(),
  })

  const [warnings, setWarnings] = useState<string[]>([])
  const [isMonitoring, setIsMonitoring] = useState(false)

  const frameCountRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const renderStartTimeRef = useRef(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const rafRef = useRef<number | null>(null)

  // FPS 계산
  const calculateFPS = useCallback(() => {
    const currentTime = performance.now()
    const deltaTime = currentTime - lastTimeRef.current
    const fps = Math.round((1000 / deltaTime) * frameCountRef.current)

    lastTimeRef.current = currentTime
    frameCountRef.current = 0

    return fps
  }, [])

  // 메모리 사용량 확인
  const getMemoryUsage = useCallback(() => {
    if (!enableMemoryMonitoring || !('memory' in performance)) {
      return null
    }

    const memory = (performance as any).memory
    return memory.usedJSHeapSize
  }, [enableMemoryMonitoring])

  // 렌더링 시간 측정
  const startRenderTimer = useCallback(() => {
    if (enableRenderTimeMonitoring) {
      renderStartTimeRef.current = performance.now()
    }
  }, [enableRenderTimeMonitoring])

  const endRenderTimer = useCallback(() => {
    if (enableRenderTimeMonitoring && renderStartTimeRef.current > 0) {
      const renderTime = performance.now() - renderStartTimeRef.current
      renderStartTimeRef.current = 0
      return renderTime
    }
    return 0
  }, [enableRenderTimeMonitoring])

  // 성능 메트릭 업데이트
  const updateMetrics = useCallback(() => {
    const fps = enableFPSMonitoring ? calculateFPS() : 0
    const memoryUsage = getMemoryUsage()
    const renderTime = endRenderTimer()
    const componentCount = document.querySelectorAll('[class*="landscape-"]').length

    const newMetrics: PerformanceMetrics = {
      fps,
      renderTime,
      memoryUsage,
      componentCount,
      lastUpdate: Date.now(),
    }

    setMetrics(newMetrics)

    // 성능 경고 확인
    const newWarnings: string[] = []

    if (fps < fpsThreshold) {
      newWarnings.push(`FPS가 낮습니다: ${fps} (권장: ${fpsThreshold}+)`)
    }

    if (memoryUsage && memoryUsage > memoryThreshold) {
      newWarnings.push(`메모리 사용량이 높습니다: ${Math.round(memoryUsage / 1024 / 1024)}MB`)
    }

    if (renderTime > renderTimeThreshold) {
      newWarnings.push(`렌더링 시간이 길습니다: ${renderTime.toFixed(2)}ms`)
    }

    setWarnings(newWarnings)
  }, [
    enableFPSMonitoring,
    enableMemoryMonitoring,
    enableRenderTimeMonitoring,
    calculateFPS,
    getMemoryUsage,
    endRenderTimer,
    fpsThreshold,
    memoryThreshold,
    renderTimeThreshold,
  ])

  // FPS 모니터링 루프
  const fpsLoop = useCallback(() => {
    frameCountRef.current++
    rafRef.current = requestAnimationFrame(fpsLoop)
  }, [])

  // 성능 모니터링 시작
  const startMonitoring = useCallback(() => {
    if (isMonitoring) return

    setIsMonitoring(true)
    lastTimeRef.current = performance.now()
    frameCountRef.current = 0

    if (enableFPSMonitoring) {
      rafRef.current = requestAnimationFrame(fpsLoop)
    }

    if (updateInterval > 0) {
      intervalRef.current = setInterval(updateMetrics, updateInterval)
    }
  }, [isMonitoring, enableFPSMonitoring, updateInterval, fpsLoop, updateMetrics])

  // 성능 모니터링 중지
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false)

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  // 컴포넌트 렌더링 시작 시 타이머 시작
  useEffect(() => {
    startRenderTimer()
  })

  // 컴포넌트 렌더링 완료 시 타이머 종료
  useEffect(() => {
    const renderTime = endRenderTimer()
    if (renderTime > 0) {
      // 렌더링 시간이 측정되면 메트릭 업데이트
      setMetrics((prev) => ({
        ...prev,
        renderTime,
      }))
    }
  })

  // 컴포넌트 마운트/언마운트 시 정리
  useEffect(() => {
    startMonitoring()

    return () => {
      stopMonitoring()
    }
  }, [startMonitoring, stopMonitoring])

  // 성능 최적화 제안
  const getOptimizationSuggestions = useCallback(() => {
    const suggestions: string[] = []

    if (metrics.fps < fpsThreshold) {
      suggestions.push('불필요한 리렌더링을 줄이세요')
      suggestions.push('React.memo를 사용하여 컴포넌트를 메모이제이션하세요')
      suggestions.push('useCallback과 useMemo를 활용하세요')
    }

    if (metrics.memoryUsage && metrics.memoryUsage > memoryThreshold) {
      suggestions.push('메모리 누수를 확인하세요')
      suggestions.push('이벤트 리스너를 적절히 정리하세요')
      suggestions.push('큰 객체나 배열을 불필요하게 생성하지 마세요')
    }

    if (metrics.renderTime > renderTimeThreshold) {
      suggestions.push('복잡한 계산을 useMemo로 최적화하세요')
      suggestions.push('가상화(virtualization)를 고려하세요')
      suggestions.push('CSS 애니메이션을 GPU 가속을 활용하세요')
    }

    if (metrics.componentCount > 100) {
      suggestions.push('컴포넌트를 더 작은 단위로 분리하세요')
      suggestions.push('불필요한 중첩을 줄이세요')
    }

    return suggestions
  }, [metrics, fpsThreshold, memoryThreshold, renderTimeThreshold])

  // 성능 리포트 생성
  const generatePerformanceReport = useCallback(() => {
    const suggestions = getOptimizationSuggestions()

    return {
      metrics,
      warnings,
      suggestions,
      timestamp: new Date().toISOString(),
      summary: {
        status: warnings.length === 0 ? '양호' : '주의 필요',
        score: Math.max(0, 100 - warnings.length * 20),
      },
    }
  }, [metrics, warnings, getOptimizationSuggestions])

  return {
    metrics,
    warnings,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getOptimizationSuggestions,
    generatePerformanceReport,
    startRenderTimer,
    endRenderTimer,
  }
}

/**
 * 특정 성능 지표를 위한 전용 훅들
 */
export function useFPSMonitor(threshold: number = 30) {
  const { metrics, warnings } = usePerformanceMonitor({
    enableFPSMonitoring: true,
    enableMemoryMonitoring: false,
    enableRenderTimeMonitoring: false,
    fpsThreshold: threshold,
  })

  return {
    fps: metrics.fps,
    isLowFPS: metrics.fps < threshold,
    warnings: warnings.filter((w) => w.includes('FPS')),
  }
}

export function useMemoryMonitor(threshold: number = 50 * 1024 * 1024) {
  const { metrics, warnings } = usePerformanceMonitor({
    enableFPSMonitoring: false,
    enableMemoryMonitoring: true,
    enableRenderTimeMonitoring: false,
    memoryThreshold: threshold,
  })

  return {
    memoryUsage: metrics.memoryUsage,
    isHighMemory: metrics.memoryUsage ? metrics.memoryUsage > threshold : false,
    warnings: warnings.filter((w) => w.includes('메모리')),
  }
}

export function useRenderTimeMonitor(threshold: number = 16) {
  const { metrics, warnings } = usePerformanceMonitor({
    enableFPSMonitoring: false,
    enableMemoryMonitoring: false,
    enableRenderTimeMonitoring: true,
    renderTimeThreshold: threshold,
  })

  return {
    renderTime: metrics.renderTime,
    isSlowRender: metrics.renderTime > threshold,
    warnings: warnings.filter((w) => w.includes('렌더링')),
  }
}
