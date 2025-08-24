import { useCallback, useReducer, useRef, useState } from 'react'
import { battleReducer, createInitialState } from '../../scenes/battleReducer'

export interface BattleLogicProps {
  role: string
  onRoundComplete?: (roundData: any) => void
  onBattleEnd?: (result: any) => void
}

export function useBattleLogic({ role, onRoundComplete, onBattleEnd }: BattleLogicProps) {
  const [state, dispatch] = useReducer(battleReducer, createInitialState(role))
  const [timeLeft, setTimeLeft] = useState(10)
  const timerRef = useRef<number | null>(null)

  const {
    round,
    role: currentRole,
    choice,
    oppChoice: opponentChoice,
    log,
    momentum,
    selfHp,
    selfMaxHp,
    oppHp,
    oppMaxHp,
    selfInjuries,
    oppInjuries,
  } = state

  // 라운드 해결 함수
  const resolveRound = useCallback(
    (roundData: any) => {
      dispatch({ type: 'RESOLVE_ROUND', payload: roundData })
      onRoundComplete?.(roundData)
    },
    [onRoundComplete]
  )

  // 전투 종료 처리
  const handleBattleEnd = useCallback(
    (result: any) => {
      dispatch({ type: 'BATTLE_END', payload: result })
      onBattleEnd?.(result)
    },
    [onBattleEnd]
  )

  // 타이머 시작
  const startTimer = useCallback(() => {
    if (timerRef.current) return

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // 시간 초과 시 기본 선택
          dispatch({ type: 'TIME_OUT' })
          return 10
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  // 타이머 정지
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // 타이머 리셋
  const resetTimer = useCallback(() => {
    stopTimer()
    setTimeLeft(10)
    startTimer()
  }, [startTimer, stopTimer])

  // 선택 처리
  const handleChoice = useCallback(
    (selectedChoice: string) => {
      dispatch({ type: 'MAKE_CHOICE', payload: selectedChoice })
      stopTimer()
    },
    [stopTimer]
  )

  // 컴포넌트 정리
  const cleanup = useCallback(() => {
    stopTimer()
  }, [stopTimer])

  return {
    // 상태
    state,
    timeLeft,

    // 액션
    resolveRound,
    handleBattleEnd,
    handleChoice,

    // 타이머 제어
    startTimer,
    stopTimer,
    resetTimer,

    // 정리
    cleanup,
  }
}
