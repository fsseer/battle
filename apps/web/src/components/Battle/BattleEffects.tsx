import { useCallback, useRef, useState } from 'react'

export interface BattleEffectsProps {
  onShake?: (intensity: number) => void
  onHitstop?: (duration: number) => void
  onSpark?: (x: number, y: number) => void
  onParticle?: (
    particles: Array<{ x: number; y: number; vx: number; vy: number; life: number; ttl: number }>
  ) => void
}

export function useBattleEffects({ onShake, onHitstop, onSpark, onParticle }: BattleEffectsProps) {
  const [shakeMs, setShakeMs] = useState(0)
  const [hitstopMs, setHitstopMs] = useState(0)
  const [cam, setCam] = useState({ x: 0, y: 0 })
  const frameRef = useRef<number | null>(null)
  const [spark, setSpark] = useState<{ x: number; y: number; t: number } | null>(null)
  const [particles, setParticles] = useState<
    Array<{ x: number; y: number; vx: number; vy: number; life: number; ttl: number }>
  >([])
  const [trail, setTrail] = useState<{ id: string; t: number; ttl: number } | null>(null)

  // 카메라 흔들림 효과
  const triggerShake = useCallback(
    (intensity: number, duration: number = 200) => {
      setShakeMs(duration)
      onShake?.(intensity)

      // 흔들림 효과 애니메이션
      const startTime = Date.now()
      const animateShake = () => {
        const elapsed = Date.now() - startTime
        const progress = elapsed / duration

        if (progress < 1) {
          const shakeX = (Math.random() - 0.5) * intensity * (1 - progress)
          const shakeY = (Math.random() - 0.5) * intensity * (1 - progress)
          setCam({ x: shakeX, y: shakeY })
          frameRef.current = requestAnimationFrame(animateShake)
        } else {
          setCam({ x: 0, y: 0 })
          setShakeMs(0)
        }
      }

      frameRef.current = requestAnimationFrame(animateShake)
    },
    [onShake]
  )

  // 히트스톱 효과
  const triggerHitstop = useCallback(
    (duration: number = 100) => {
      setHitstopMs(duration)
      onHitstop?.(duration)

      setTimeout(() => {
        setHitstopMs(0)
      }, duration)
    },
    [onHitstop]
  )

  // 스파크 효과
  const triggerSpark = useCallback(
    (x: number, y: number) => {
      setSpark({ x, y, t: Date.now() })
      onSpark?.(x, y)

      setTimeout(() => {
        setSpark(null)
      }, 300)
    },
    [onSpark]
  )

  // 파티클 효과
  const triggerParticles = useCallback(
    (x: number, y: number, count: number = 10) => {
      const newParticles = Array.from({ length: count }, () => ({
        x,
        y,
        vx: (Math.random() - 0.5) * 200,
        vy: (Math.random() - 0.5) * 200,
        life: 1,
        ttl: 1000,
      }))

      setParticles(newParticles)
      onParticle?.(newParticles)

      // 파티클 애니메이션
      const startTime = Date.now()
      const animateParticles = () => {
        const elapsed = Date.now() - startTime

        setParticles(
          (prev) =>
            prev
              .map((particle) => {
                const progress = elapsed / particle.ttl
                if (progress >= 1) return null

                return {
                  ...particle,
                  x: particle.x + particle.vx * 0.016, // 60fps 가정
                  y: particle.y + particle.vy * 0.016,
                  life: 1 - progress,
                }
              })
              .filter(Boolean) as typeof particles
        )

        if (elapsed < 1000) {
          frameRef.current = requestAnimationFrame(animateParticles)
        }
      }

      frameRef.current = requestAnimationFrame(animateParticles)
    },
    [onParticle]
  )

  // 트레일 효과
  const triggerTrail = useCallback((id: string, duration: number = 500) => {
    setTrail({ id, t: Date.now(), ttl: duration })

    setTimeout(() => {
      setTrail(null)
    }, duration)
  }, [])

  // 컴포넌트 정리
  const cleanup = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  return {
    // 효과 상태
    shakeMs,
    hitstopMs,
    cam,
    spark,
    particles,
    trail,

    // 효과 트리거
    triggerShake,
    triggerHitstop,
    triggerSpark,
    triggerParticles,
    triggerTrail,

    // 정리
    cleanup,
  }
}
