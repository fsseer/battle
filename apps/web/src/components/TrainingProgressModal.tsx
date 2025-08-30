import { useEffect, useState } from 'react'
import './TrainingProgressModal.css'

export interface TrainingResult {
  success: boolean
  message: string
  expGained: number
  stressChange: number
  apCost: number
  goldCost: number
  statExpGained?: number // 능력치별 경험치
  weaponExpGained?: number // 무기술별 경험치
}

interface TrainingProgressModalProps {
  isOpen: boolean
  onClose: () => void
  trainingName: string
  duration: number // 훈련 시간 (초)
  apCost: number // AP 소모량
  goldCost: number // 골드 소모량
  onComplete: (result: TrainingResult, checkpoints: CheckpointResult[], baseExp: number) => void
  onResourceUpdate?: (apChange: number, goldChange: number, stressChange: number) => void
}

interface CheckpointResult {
  time: number
  result: '대실패' | '실패' | '성공' | '대성공'
  message: string
  expEffect: number // 경험치 효과 (+/-)
  stressEffect: number // 스트레스 효과 (+/-)
}

// 성장 모델: 경험치 요구량 (향후 레벨 계산에 사용 예정)
const EXP_REQUIREMENTS = [
  0, 10, 13, 36, 265, 3134, 46665, 823552, 16777225, 387420498, 10000000009, 285311670620, 8916100448265, 302875106592262
]

// 훈련 이름에서 능력치/무기술 타입 추출
const getTrainingType = (trainingName: string): { type: 'stat' | 'weapon', category: string } => {
  if (trainingName.includes('힘')) return { type: 'stat', category: 'strength' }
  if (trainingName.includes('민첩')) return { type: 'stat', category: 'agility' }
  if (trainingName.includes('지능')) return { type: 'stat', category: 'intelligence' }
  if (trainingName.includes('한손검')) return { type: 'weapon', category: 'one_hand' }
  if (trainingName.includes('양손검')) return { type: 'weapon', category: 'two_hand' }
  if (trainingName.includes('쌍검')) return { type: 'weapon', category: 'dual' }
  if (trainingName.includes('체력')) return { type: 'stat', category: 'constitution' }
  
  // 기본값
  return { type: 'stat', category: 'general' }
}

export default function TrainingProgressModal({
  isOpen,
  onClose,
  trainingName,
  duration,
  apCost,
  goldCost,
  onComplete,
  onResourceUpdate,
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

    let currentTime = 0
    const interval = setInterval(() => {
      currentTime += 1
      const newProgress = (currentTime / duration) * 100

      // 5초마다 점검 (시작점 제외, 중복 방지)
      if (currentTime % 5 === 0 && currentTime > 0 && currentTime <= duration) {
        console.log(`[Training] ${currentTime}초 체크포인트 체크`)
        // 함수형 업데이트를 사용하여 최신 상태로 중복 체크
        setCheckpoints((prevCheckpoints) => {
          // 이미 해당 시간에 체크포인트가 있는지 확인
          if (prevCheckpoints.some((c) => c.time === currentTime)) {
            console.log(`[Training] ${currentTime}초 체크포인트 이미 존재`)
            return prevCheckpoints
          }

          const checkpointResult = generateCheckpointResult(currentTime)
          console.log(`[Training] ${currentTime}초 판정 생성:`, checkpointResult)
          
          // 스트레스 변화가 있으면 부모 컴포넌트에 즉시 전달
          if (checkpointResult.stressEffect !== 0 && onResourceUpdate) {
            onResourceUpdate(0, 0, checkpointResult.stressEffect)
          }
          
          return [...prevCheckpoints, checkpointResult]
        })
      }

      // 훈련 완료
      if (currentTime >= duration) {
        console.log(`[Training] 훈련 완료, 총 체크포인트:`, checkpoints.length)
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

      setProgress(newProgress)
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

    // 훈련 타입에 따른 경험치 분류
    const trainingType = getTrainingType(trainingName)
    let statExpGained = 0
    let weaponExpGained = 0

    if (trainingType.type === 'stat') {
      statExpGained = finalExp
    } else if (trainingType.type === 'weapon') {
      weaponExpGained = finalExp
    }

    return {
      success: true, // 성공/실패 구분 없음
      message: `${trainingName} 훈련이 완료되었습니다!`,
      expGained: finalExp,
      stressChange: totalStress,
      apCost: apCost,
      goldCost: goldCost,
      statExpGained,
      weaponExpGained,
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
          <div className="resource-costs">
            <span className="cost-item">AP: -{apCost}</span>
            {goldCost > 0 && <span className="cost-item">골드: -{goldCost}</span>}
          </div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>

        <div className="checkpoints-display">
          <h3>중간 결과 ({checkpoints.length}/3)</h3>
          <div className="checkpoints-list">
            {checkpoints.length === 0 ? (
              <div className="no-checkpoints">
                <p>아직 중간 결과가 없습니다...</p>
              </div>
            ) : (
              checkpoints.map((checkpoint, index) => (
                <div
                  key={`${checkpoint.time}-${index}`}
                  className="checkpoint-result"
                  style={{
                    color: getResultColor(checkpoint.result),
                    borderLeftColor: getResultColor(checkpoint.result),
                  }}
                >
                  <div className="checkpoint-header">
                    <span className="checkpoint-time">{checkpoint.time}초</span>
                    <span className="checkpoint-result-text">{checkpoint.result}</span>
                  </div>
                  <span className="checkpoint-icon">{getResultIcon(checkpoint.result)}</span>
                  <span className="checkpoint-message">{checkpoint.message}</span>
                  <div className="checkpoint-effects">
                    {checkpoint.expEffect !== 0 && (
                      <span className="exp-effect">EXP: {formatEffect(checkpoint.expEffect)}</span>
                    )}
                    {checkpoint.stressEffect !== 0 && (
                      <span className="stress-effect">
                        Stress:{' '}
                        {checkpoint.stressEffect > 0
                          ? `+${checkpoint.stressEffect}`
                          : checkpoint.stressEffect}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
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
