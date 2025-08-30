import React from 'react'
import './TrainingResultModal.css'

interface TrainingResultModalProps {
  isOpen: boolean
  onClose: () => void
  result: {
    expGained: number
    stressChange: number
    success: boolean
    statExpGained?: number
    weaponExpGained?: number
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

  return (
    <div className="training-result-modal">
      <div className="result-content">
        <div className="result-header">
          <h2>🏆 훈련 결과</h2>
          <button className="close-result-btn" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="result-summary">
          <div className="result-icon">⚔️</div>
          <div className="result-message">{trainingName || '훈련'} 완료!</div>
        </div>

        {/* 기본 경험치 정보 */}
        {baseExp && (
          <div className="base-exp-info">
            <h4>📚 기본 경험치</h4>
            <div className="base-exp-item">
              <span className="detail-label">{trainingName || '훈련'}</span>
              <span className="detail-value base-exp">+{baseExp}</span>
            </div>
          </div>
        )}

        {/* 체크포인트 결과 표시 */}
        {checkpoints && checkpoints.length > 0 && (
          <div className="checkpoints-summary">
            <h4>🎯 중간 판정 결과</h4>
            {checkpoints.map((checkpoint, index) => (
              <div key={index} className="checkpoint-summary-item">
                <div className="checkpoint-header">
                  <span className="checkpoint-time">{checkpoint.time}초</span>
                  <span
                    className="checkpoint-result"
                    style={{ color: getResultColor(checkpoint.result) }}
                  >
                    {getResultIcon(checkpoint.result)} {checkpoint.result}
                  </span>
                </div>
                <div className="checkpoint-details">
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
              </div>
            ))}
          </div>
        )}

        {/* 수정자 적용 과정 */}
        {checkpoints && checkpoints.length > 0 && (
          <div className="modifier-calculation">
            <h4>📊 경험치 수정 과정</h4>
            <div className="modifier-list">
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
          </div>
        )}

        {/* 최종 결과 */}
        <div className="final-result">
          <h4>🎖️ 최종 결과</h4>
          <div className="detail-item">
            <span className="detail-label">획득 경험치:</span>
            <span className="detail-value exp-gained">+{result.expGained}</span>
          </div>
          {result.stressChange !== 0 && (
            <div className="detail-item">
              <span className="detail-label">스트레스 변화:</span>
              <span className="detail-value stress-change">
                {result.stressChange > 0 ? '+' : ''}
                {result.stressChange}
              </span>
            </div>
          )}
        </div>

        {/* 능력치별 경험치 */}
        {result.statExpGained && result.statExpGained > 0 && (
          <div className="stat-exp-result">
            <h4>💪 능력치 성장</h4>
            <div className="detail-item">
              <span className="detail-label">능력치 경험치:</span>
              <span className="detail-value stat-exp">+{result.statExpGained}</span>
            </div>
          </div>
        )}

        {/* 무기술별 경험치 */}
        {result.weaponExpGained && result.weaponExpGained > 0 && (
          <div className="weapon-exp-result">
            <h4>⚔️ 무기술 성장</h4>
            <div className="detail-item">
              <span className="detail-label">무기술 경험치:</span>
              <span className="detail-value weapon-exp">+{result.weaponExpGained}</span>
            </div>
          </div>
        )}

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
