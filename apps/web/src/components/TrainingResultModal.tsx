import React from 'react'
import './TrainingResultModal.css'

interface TrainingResultModalProps {
  isOpen: boolean
  onClose: () => void
  result: {
    expGained: number
    stressChange: number
    success: boolean
  }
  checkpoints?: Array<{
    time: number
    result: string
    message: string
    expEffect: number
    stressEffect: number
  }>
  trainingName?: string // 훈련 이름 추가
  baseExp?: number // 기본 경험치 추가
}

const TrainingResultModal: React.FC<TrainingResultModalProps> = ({
  isOpen,
  onClose,
  result,
  checkpoints,
  trainingName,
  baseExp,
}) => {
  if (!isOpen) return null

  const formatEffect = (effect: number) => {
    if (effect > 0) return `+${effect}%`
    if (effect < 0) return `${effect}%`
    return '0%'
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

  return (
    <div className="training-result-modal">
      <div className="result-content">
        <div className="result-header">
          <h2>훈련 결과</h2>
          <button className="close-result-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="result-summary">
          <div className="result-icon">⚔️</div>
          <div className="result-message">훈련 결과</div>
        </div>

        {/* 체크포인트 결과 표시 */}
        {checkpoints && checkpoints.length > 0 && (
          <div className="checkpoints-summary">
            <h4>중간 결과</h4>
            {checkpoints.map((checkpoint, index) => (
              <div key={index} className="checkpoint-summary-item">
                <div className="checkpoint-header">
                  <span className="checkpoint-time">{checkpoint.time}초</span>
                  <span
                    className="checkpoint-result"
                    style={{ color: getResultColor(checkpoint.result) }}
                  >
                    {checkpoint.result}
                  </span>
                </div>
                <div className="checkpoint-details">
                  <span className="checkpoint-message">{checkpoint.message}</span>
                  <div className="checkpoint-effects">
                    <span className="exp-effect">EXP: {formatEffect(checkpoint.expEffect)}</span>
                    <span className="stress-effect">
                      Stress:{' '}
                      {checkpoint.stressEffect > 0
                        ? `+${checkpoint.stressEffect}`
                        : checkpoint.stressEffect}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="result-details">
          {/* 기본 경험치 정보 */}
          {baseExp && (
            <div className="base-exp-info">
              <h4>기본 경험치</h4>
              <div className="base-exp-item">
                <span className="detail-label">{trainingName || '훈련'}</span>
                <span className="detail-value base-exp">+{baseExp}</span>
              </div>
            </div>
          )}

          {/* 수정자 적용 과정 */}
          {checkpoints && checkpoints.length > 0 && (
            <div className="modifier-calculation">
              <h4>수정자 적용 과정</h4>
              {checkpoints.map((checkpoint, index) => (
                <div key={index} className="modifier-item">
                  <span className="modifier-time">{checkpoint.time}초</span>
                  <span className="modifier-result">{checkpoint.result}</span>
                  <span className="modifier-effect">
                    {checkpoint.expEffect > 0 ? '+' : ''}
                    {checkpoint.expEffect}%
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* 최종 결과 */}
          <div className="final-result">
            <h4>최종 결과</h4>
            <div className="detail-item">
              <span className="detail-label">획득 경험치:</span>
              <span className="detail-value exp-gained">+{result.expGained}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">스트레스 변화:</span>
              <span className="detail-value stress-change">
                {result.stressChange > 0 ? '+' : ''}
                {result.stressChange}
              </span>
            </div>
          </div>
        </div>

        <div className="result-actions">
          <button className="continue-btn" onClick={onClose}>
            계속하기
          </button>
        </div>
      </div>
    </div>
  )
}

export default TrainingResultModal
