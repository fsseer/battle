import { useEffect, useState } from 'react'
import './TrainingProgressModal.css'

export interface TrainingResult {
  success: boolean
  message: string
  expGained: number
  stressChange: number
  apCost: number
  goldCost: number
}

interface TrainingProgressModalProps {
  isOpen: boolean
  onClose: () => void
  trainingName: string
  duration: number // 훈련 시간 (초)
  onComplete: (result: TrainingResult, checkpoints: CheckpointResult[], baseExp: number) => void
}

interface CheckpointResult {
  time: number
  result: '대실패' | '실패' | '성공' | '대성공'
  message: string
  expEffect: number // 경험치 효과 (+/-)
  stressEffect: number // 스트레스 효과 (+/-)
}

export default function TrainingProgressModal({
  isOpen,
  onClose,
  trainingName,
  duration,
  onComplete,
}: TrainingProgressModalProps) {
  const [progress, setProgress] = useState(0)
  const [checkpoints, setCheckpoints] = useState<CheckpointResult[]>([])
  const [isCompleted, setIsCompleted] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setProgress(0)
      setCheckpoints([])
      setIsCompleted(false)
      return
    }

    const interval = setInterval(() => {
      setProgress((prevProgress) => {
        const newProgress = prevProgress + (100 / duration)

        // 5초마다 점검 (시작점 제외, 중복 방지)
        const currentTime = Math.floor((newProgress / 100) * duration)
        if (currentTime % 5 === 0 && currentTime > 0 && currentTime <= duration) {
          // 함수형 업데이트를 사용하여 최신 상태로 중복 체크
          setCheckpoints((prevCheckpoints) => {
            // 이미 해당 시간에 체크포인트가 있는지 확인
            if (prevCheckpoints.some((c) => c.time === currentTime)) {
              return prevCheckpoints
            }

            const checkpointResult = generateCheckpointResult(currentTime)
            console.log(`[Training] ${currentTime}초 판정: ${checkpointResult.result}`)
            return [...prevCheckpoints, checkpointResult]
          })
        }

        // 훈련 완료
        if (newProgress >= 100) {
          setIsCompleted(true)
          // 함수형 업데이트를 사용하여 최신 체크포인트 상태로 최종 결과 생성
          setCheckpoints((prevCheckpoints) => {
            const finalResult = generateFinalResult(prevCheckpoints)
            const baseExp = getBaseExp()
            // setTimeout을 사용하여 렌더링 중 상태 업데이트 방지
            setTimeout(() => onComplete(finalResult, prevCheckpoints, baseExp), 0)
            return prevCheckpoints
          })
        }

        return newProgress
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isOpen, duration, onComplete])

  const generateCheckpointResult = (time: number): CheckpointResult => {
    const random = Math.random()
    let result: '대실패' | '실패' | '성공' | '대성공'
    let message: string
    let expEffect: number
    let stressEffect: number

    if (random < 0.1) {
      result = '대실패'
      message = '심각한 실수로 훈련이 중단되었습니다!'
      expEffect = -20 // -20%
      stressEffect = 10
    } else if (random < 0.4) {
      result = '실패'
      message = '훈련이 제대로 진행되지 않았습니다.'
      expEffect = -10 // -10%
      stressEffect = 5
    } else if (random < 0.9) {
      result = '성공'
      message = '훈련이 순조롭게 진행되고 있습니다.'
      expEffect = 0 // 변동 없음
      stressEffect = 0
    } else {
      result = '대성공'
      message = '완벽한 훈련을 보여주고 있습니다!'
      expEffect = 20 // +20%
      stressEffect = 0
    }

    return { time, result, message, expEffect, stressEffect }
  }

  const generateFinalResult = (finalCheckpoints: CheckpointResult[]): TrainingResult => {
    // 훈련 등급별 기본 경험치 설정
    let baseExp = 0
    if (trainingName.includes('초급')) {
      baseExp = 10
    } else if (trainingName.includes('중급')) {
      baseExp = 20
    } else if (trainingName.includes('고급')) {
      baseExp = 50
    }

    let totalStress = 0
    let expModifier = 1.0 // 경험치 수정자

    // 3회의 판정 결과에 따른 수정자와 스트레스 계산
    finalCheckpoints.forEach((checkpoint) => {
      switch (checkpoint.result) {
        case '대실패':
          totalStress += checkpoint.stressEffect
          expModifier -= 0.2 // -20%
          break
        case '실패':
          totalStress += checkpoint.stressEffect
          expModifier -= 0.1 // -10%
          break
        case '성공':
          // 경험치 변동 없음
          break
        case '대성공':
          expModifier += 0.2 // +20%
          break
      }
    })

    // 최종 경험치 계산 (수정자 적용)
    const finalExp = Math.max(0, Math.round(baseExp * expModifier))

    return {
      success: true, // 성공/실패 구분 없음
      message: `${trainingName} 훈련이 완료되었습니다!`,
      expGained: finalExp,
      stressChange: totalStress,
      apCost: 0, // 실제 AP 비용은 훈련 시작 시 이미 차감됨
      goldCost: 0, // 실제 골드 비용은 훈련 시작 시 이미 차감됨
    }
  }

  const getBaseExp = () => {
    let baseExp = 0
    if (trainingName.includes('초급')) {
      baseExp = 10
    } else if (trainingName.includes('중급')) {
      baseExp = 20
    } else if (trainingName.includes('고급')) {
      baseExp = 50
    }
    return baseExp
  }

  const getResultColor = (result: string) => {
    switch (result) {
      case '대실패':
        return '#e74c3c'
      case '실패':
        return '#f39c12'
      case '성공':
        return '#27ae60'
      case '대성공':
        return '#8e44ad'
      default:
        return '#95a5a6'
    }
  }

  const getResultIcon = (result: string) => {
    switch (result) {
      case '대실패':
        return '💥'
      case '실패':
        return '😞'
      case '성공':
        return '👍'
      case '대성공':
        return '🎉'
      default:
        return '❓'
    }
  }

  const formatEffect = (effect: number) => {
    if (effect > 0) return `+${effect}%`
    if (effect < 0) return `${effect}%`
    return '0%'
  }

  if (!isOpen) return null

  return (
    <div className="training-progress-modal">
      <div className="progress-content">
        <div className="progress-header">
          <h2>🏋️ {trainingName} 훈련 진행 중...</h2>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
          <div className="progress-labels">
            {Array.from({ length: Math.floor(duration / 5) }, (_, i) => (
              <div
                key={i}
                className="progress-checkpoint"
                style={{ left: `${(((i + 1) * 5) / duration) * 100}%` }}
              >
                <span className="checkpoint-dot"></span>
              </div>
            ))}
          </div>
        </div>

        <div className="checkpoints-display">
          <h3>중간 결과</h3>
          <div className="checkpoints-list">
            {checkpoints.map((checkpoint, index) => (
              <div
                key={index}
                className="checkpoint-result"
                style={{ color: getResultColor(checkpoint.result) }}
              >
                <span className="checkpoint-icon">{getResultIcon(checkpoint.result)}</span>
                <span className="checkpoint-result-text">{checkpoint.result}</span>
                <span className="checkpoint-message">{checkpoint.message}</span>
                <div className="checkpoint-effects">
                  {checkpoint.expEffect !== 0 && (
                    <span className="exp-effect">EXP: {formatEffect(checkpoint.expEffect)}</span>
                  )}
                  {checkpoint.stressEffect !== 0 && (
                    <span className="stress-effect">
                      Stress: {checkpoint.stressEffect > 0 ? `+${checkpoint.stressEffect}` : checkpoint.stressEffect}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isCompleted && (
          <div className="completion-message">
            <h3>🎯 훈련 완료!</h3>
            <p>결과를 확인하려면 닫기 버튼을 클릭하세요.</p>
            <button className="close-btn" onClick={onClose}>
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
