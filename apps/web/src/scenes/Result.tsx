import { useNavigate } from 'react-router-dom'
import { useTokenValidation } from '../hooks/useTokenValidation'
import GameHeader from '../components/GameHeader'
import LandscapeLayout, {
  LandscapeMenuPanel,
  LandscapeSection,
  LandscapeCard,
  LandscapeButton,
} from '../components/LandscapeLayout'
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'

export default function Result() {
  const navigate = useNavigate()

  // 가로형 레이아웃 상태 및 최적화 훅 사용
  const { canDisplayGame } = useLandscapeLayout()

  // 토큰 유효성 검증 훅 사용
  useTokenValidation()

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!canDisplayGame) {
    return null // App.tsx에서 처리됨
  }

  // TODO: 실제 결과/보상/로그 요약 연결
  return (
    <div className="result-layout landscape-layout">
      {/* 상단 헤더 */}
      <GameHeader />

      {/* 메인 콘텐츠 - 새로운 가로형 레이아웃 사용 */}
      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="🏆 전투 결과" subtitle="승리 및 보상">
            <LandscapeSection title="📊 결과 요약">
              <LandscapeCard>
                <div className="landscape-status-grid">
                  <div className="status-item">
                    <span className="status-label">결과</span>
                    <span className="status-value">승리</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">경험치</span>
                    <span className="status-value">+150</span>
                  </div>
                  <div className="status-item">
                    <span className="status-label">골드</span>
                    <span className="status-value">+50</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="🎯 성과">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">연속 승리</span>
                    <span className="item-value">3회</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">최고 기록</span>
                    <span className="item-value">5회</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
        rightPanel={
          <LandscapeMenuPanel title="🎮 다음 액션" subtitle="게임 계속하기">
            <LandscapeSection title="⚔️ 다시 전투">
              <LandscapeCard>
                <LandscapeButton
                  onClick={() => navigate('/battle')}
                  variant="primary"
                  className="retry-btn"
                >
                  ⚔️ 다시하기
                </LandscapeButton>
                <p className="action-hint">같은 상대와 다시 전투합니다</p>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="🏛️ 로비 이동">
              <LandscapeCard>
                <LandscapeButton
                  onClick={() => navigate('/lobby')}
                  variant="secondary"
                  className="lobby-btn"
                >
                  🏛️ 로비로
                </LandscapeButton>
                <p className="action-hint">로비로 돌아갑니다</p>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
      >
        {/* 중앙 결과 표시 영역 */}
        <div className="result-center-area landscape-center-content">
          <div className="result-info">
            <h2>🏆 전투 결과</h2>
            <p>프로토타입 결과 화면입니다.</p>

            <div className="result-summary">
              <div className="summary-item">
                <span className="summary-label">전투 결과:</span>
                <span className="summary-value">승리</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">획득 경험치:</span>
                <span className="summary-value">150</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">획득 골드:</span>
                <span className="summary-value">50</span>
              </div>
            </div>

            <div className="result-actions">
              <LandscapeButton
                onClick={() => navigate('/battle')}
                variant="primary"
                className="retry-btn"
              >
                ⚔️ 다시하기
              </LandscapeButton>
              <LandscapeButton
                onClick={() => navigate('/lobby')}
                variant="secondary"
                className="lobby-btn"
              >
                🏛️ 로비로
              </LandscapeButton>
            </div>
          </div>
        </div>
      </LandscapeLayout>
    </div>
  )
}
