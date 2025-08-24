import { useState, useEffect, useCallback } from 'react'

interface LandscapeLayoutState {
  isLandscape: boolean
  isPortrait: boolean
  width: number
  height: number
  isHighResolution: boolean
  isLowResolution: boolean
  orientation: 'landscape' | 'portrait'
  canDisplayGame: boolean
  resolutionMessage: string
}

/**
 * 가로형 레이아웃을 위한 유틸리티 훅
 * 화면 크기와 방향을 감지하고 가로형 최적화를 제공
 */
export function useLandscapeLayout(): LandscapeLayoutState {
  const [state, setState] = useState<LandscapeLayoutState>({
    isLandscape: false,
    isPortrait: false,
    width: 0,
    height: 0,
    isHighResolution: false,
    isLowResolution: false,
    orientation: 'portrait',
    canDisplayGame: false,
    resolutionMessage: '',
  })

  const updateLayoutState = useCallback(() => {
    const width = window.innerWidth
    const height = window.innerHeight

    // 방향 감지
    const isLandscape = width > height
    const isPortrait = height > width
    const orientation = isLandscape ? 'landscape' : 'portrait'

    // 해상도 감지 (720p 기준)
    const isHighResolution = width >= 1280 && height >= 720
    const isLowResolution = width < 1280 || height < 720

    // 게임 표시 가능 여부
    const canDisplayGame = isLandscape && isHighResolution

    // 메시지 생성
    let resolutionMessage = ''
    if (isPortrait) {
      resolutionMessage = '가로 모드로 회전해주세요'
    } else if (isLowResolution) {
      resolutionMessage = '해상도를 1280x720 이상으로 확대해주세요'
    }

    setState({
      isLandscape,
      isPortrait,
      width,
      height,
      isHighResolution,
      isLowResolution,
      orientation,
      canDisplayGame,
      resolutionMessage,
    })
  }, [])

  useEffect(() => {
    // 초기 상태 설정
    updateLayoutState()

    // 리사이즈 이벤트 리스너
    window.addEventListener('resize', updateLayoutState)
    window.addEventListener('orientationchange', updateLayoutState)

    return () => {
      window.removeEventListener('resize', updateLayoutState)
      window.removeEventListener('orientationchange', updateLayoutState)
    }
  }, [updateLayoutState])

  return state
}

/**
 * 가로형 레이아웃 최적화를 위한 유틸리티 훅
 */
export function useLandscapeOptimization() {
  const layoutState = useLandscapeLayout()

  // 패널 크기 최적화
  const getOptimalPanelWidth = useCallback(() => {
    if (layoutState.width >= 1600) return 320
    if (layoutState.width >= 1366) return 280
    if (layoutState.width >= 1024) return 260
    return 240
  }, [layoutState.width])

  // 그리드 컬럼 수 최적화
  const getOptimalGridColumns = useCallback(() => {
    if (layoutState.width >= 1600) return 4
    if (layoutState.width >= 1366) return 3
    if (layoutState.width >= 1024) return 2
    return 1
  }, [layoutState.width])

  // 폰트 크기 최적화
  const getOptimalFontSize = useCallback(
    (baseSize: number) => {
      if (layoutState.width >= 1600) return baseSize
      if (layoutState.width >= 1366) return baseSize * 0.9
      if (layoutState.width >= 1024) return baseSize * 0.8
      return baseSize * 0.7
    },
    [layoutState.width]
  )

  // 패딩 최적화
  const getOptimalPadding = useCallback(() => {
    if (layoutState.width >= 1600) return 40
    if (layoutState.width >= 1366) return 32
    if (layoutState.width >= 1024) return 24
    return 20
  }, [layoutState.width])

  // 간격 최적화
  const getOptimalGap = useCallback(() => {
    if (layoutState.width >= 1600) return 24
    if (layoutState.width >= 1366) return 20
    if (layoutState.width >= 1024) return 16
    return 12
  }, [layoutState.width])

  return {
    ...layoutState,
    getOptimalPanelWidth,
    getOptimalGridColumns,
    getOptimalFontSize,
    getOptimalPadding,
    getOptimalGap,
  }
}

/**
 * 가로형 레이아웃 클래스명 생성을 위한 유틸리티 훅
 */
export function useLandscapeClasses() {
  const layoutState = useLandscapeLayout()

  const getLayoutClasses = useCallback(() => {
    const classes = ['landscape-layout']

    if (layoutState.isHighResolution) classes.push('landscape-high-res')
    if (layoutState.width >= 1600) classes.push('landscape-xl')
    else if (layoutState.width >= 1366) classes.push('landscape-lg')
    else if (layoutState.width >= 1024) classes.push('landscape-md')
    else classes.push('landscape-sm')

    return classes.join(' ')
  }, [layoutState.isHighResolution, layoutState.width])

  const getPanelClasses = useCallback(() => {
    const classes = ['landscape-menu-panel']

    if (layoutState.width >= 1600) classes.push('landscape-panel-xl')
    else if (layoutState.width >= 1366) classes.push('landscape-panel-lg')
    else if (layoutState.width >= 1024) classes.push('landscape-panel-md')
    else classes.push('landscape-panel-sm')

    return classes.join(' ')
  }, [layoutState.width])

  const getContentClasses = useCallback(() => {
    const classes = ['landscape-center-content']

    if (layoutState.width >= 1600) classes.push('landscape-content-xl')
    else if (layoutState.width >= 1366) classes.push('landscape-content-lg')
    else if (layoutState.width >= 1024) classes.push('landscape-content-md')
    else classes.push('landscape-content-sm')

    return classes.join(' ')
  }, [layoutState.width])

  return {
    getLayoutClasses,
    getPanelClasses,
    getContentClasses,
  }
}
