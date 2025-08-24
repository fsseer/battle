import { useState, useEffect, useCallback, useRef } from 'react'

export interface AnimationState {
  isAnimating: boolean
  currentAnimation: string | null
  animationProgress: number
}

export interface AnimationConfig {
  duration?: number
  easing?: string
  delay?: number
  onComplete?: () => void
}

/**
 * 가로형 레이아웃 애니메이션을 관리하는 훅
 */
export function useLandscapeAnimations() {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isAnimating: false,
    currentAnimation: null,
    animationProgress: 0,
  })

  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  // 애니메이션 시작
  const startAnimation = useCallback((animationName: string, config: AnimationConfig = {}) => {
    const { duration = 1000, easing = 'ease-out', delay = 0, onComplete } = config

    setAnimationState((prev) => ({
      ...prev,
      isAnimating: true,
      currentAnimation: animationName,
      animationProgress: 0,
    }))

    startTimeRef.current = Date.now()

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTimeRef.current - delay
      const progress = Math.min(Math.max(elapsed / duration, 0), 1)

      setAnimationState((prev) => ({
        ...prev,
        animationProgress: progress,
      }))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        setAnimationState((prev) => ({
          ...prev,
          isAnimating: false,
          currentAnimation: null,
          animationProgress: 1,
        }))

        if (onComplete) {
          onComplete()
        }
      }
    }

    if (delay > 0) {
      setTimeout(() => {
        animationRef.current = requestAnimationFrame(animate)
      }, delay)
    } else {
      animationRef.current = requestAnimationFrame(animate)
    }
  }, [])

  // 애니메이션 중지
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    setAnimationState((prev) => ({
      ...prev,
      isAnimating: false,
      currentAnimation: null,
      animationProgress: 0,
    }))
  }, [])

  // 애니메이션 일시정지/재개
  const pauseAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
  }, [])

  const resumeAnimation = useCallback(() => {
    if (animationState.isAnimating && animationState.currentAnimation) {
      startAnimation(animationState.currentAnimation, {
        duration: 1000,
        delay: 0,
      })
    }
  }, [animationState.isAnimating, animationState.currentAnimation, startAnimation])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // 애니메이션 클래스 생성
  const getAnimationClass = useCallback(
    (baseClass: string, animationType: string) => {
      if (!animationState.isAnimating || animationState.currentAnimation !== animationType) {
        return baseClass
      }
      return `${baseClass} ${baseClass}--${animationType}`
    },
    [animationState.isAnimating, animationState.currentAnimation]
  )

  // 애니메이션 스타일 생성
  const getAnimationStyle = useCallback(
    (baseStyle: React.CSSProperties, animationType: string) => {
      if (!animationState.isAnimating || animationState.currentAnimation !== animationType) {
        return baseStyle
      }

      const progress = animationState.animationProgress
      const easing = (t: number) => 1 - Math.pow(1 - t, 3) // ease-out

      const easedProgress = easing(progress)

      switch (animationType) {
        case 'fadeIn':
          return {
            ...baseStyle,
            opacity: easedProgress,
            transform: `translateY(${20 * (1 - easedProgress)}px)`,
          }
        case 'slideInLeft':
          return {
            ...baseStyle,
            transform: `translateX(${-100 * (1 - easedProgress)}px)`,
            opacity: easedProgress,
          }
        case 'slideInRight':
          return {
            ...baseStyle,
            transform: `translateX(${100 * (1 - easedProgress)}px)`,
            opacity: easedProgress,
          }
        case 'scaleIn':
          return {
            ...baseStyle,
            transform: `scale(${0.8 + 0.2 * easedProgress})`,
            opacity: easedProgress,
          }
        case 'rotateIn':
          return {
            ...baseStyle,
            transform: `rotate(${-180 * (1 - easedProgress)}deg)`,
            opacity: easedProgress,
          }
        default:
          return baseStyle
      }
    },
    [animationState.isAnimating, animationState.currentAnimation, animationState.animationProgress]
  )

  // 연쇄 애니메이션
  const startChainAnimation = useCallback(
    (animations: Array<{ name: string; config: AnimationConfig }>) => {
      let currentIndex = 0

      const runNext = () => {
        if (currentIndex >= animations.length) return

        const { name, config } = animations[currentIndex]
        const isLast = currentIndex === animations.length - 1

        startAnimation(name, {
          ...config,
          onComplete: isLast ? config.onComplete : runNext,
        })

        currentIndex++
      }

      runNext()
    },
    [startAnimation]
  )

  // 마이크로 인터랙션
  const triggerMicroInteraction = useCallback(
    (type: 'bounce' | 'shake' | 'pulse' | 'wiggle') => {
      const animations = {
        bounce: [
          { name: 'bounce', config: { duration: 150, easing: 'ease-out' } },
          { name: 'bounce', config: { duration: 150, easing: 'ease-in', delay: 150 } },
          { name: 'bounce', config: { duration: 150, easing: 'ease-out', delay: 300 } },
        ],
        shake: [
          { name: 'shake', config: { duration: 100, easing: 'ease-in-out' } },
          { name: 'shake', config: { duration: 100, easing: 'ease-in-out', delay: 100 } },
          { name: 'shake', config: { duration: 100, easing: 'ease-in-out', delay: 200 } },
        ],
        pulse: [
          { name: 'pulse', config: { duration: 200, easing: 'ease-in-out' } },
          { name: 'pulse', config: { duration: 200, easing: 'ease-in-out', delay: 200 } },
        ],
        wiggle: [{ name: 'wiggle', config: { duration: 300, easing: 'ease-in-out' } }],
      }

      startChainAnimation(animations[type] || [])
    },
    [startChainAnimation]
  )

  return {
    animationState,
    startAnimation,
    stopAnimation,
    pauseAnimation,
    resumeAnimation,
    getAnimationClass,
    getAnimationStyle,
    startChainAnimation,
    triggerMicroInteraction,
  }
}

/**
 * 특정 애니메이션을 위한 전용 훅들
 */
export function useFadeInAnimation(delay: number = 0) {
  const { startAnimation, animationState } = useLandscapeAnimations()

  useEffect(() => {
    startAnimation('fadeIn', { duration: 800, delay })
  }, [startAnimation, delay])

  return animationState
}

export function useSlideInAnimation(direction: 'left' | 'right', delay: number = 0) {
  const { startAnimation, animationState } = useLandscapeAnimations()

  useEffect(() => {
    const animationName = direction === 'left' ? 'slideInLeft' : 'slideInRight'
    startAnimation(animationName, { duration: 600, delay })
  }, [startAnimation, direction, delay])

  return animationState
}

export function useScaleInAnimation(delay: number = 0) {
  const { startAnimation, animationState } = useLandscapeAnimations()

  useEffect(() => {
    startAnimation('scaleIn', { duration: 500, delay })
  }, [startAnimation, delay])

  return animationState
}
