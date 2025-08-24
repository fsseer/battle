import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useTokenValidation } from '../hooks/useTokenValidation'
import GameHeader from '../components/GameHeader'
import LandscapeLayout, {
  LandscapeMenuPanel,
  LandscapeSection,
  LandscapeCard,
  LandscapeButton,
} from '../components/LandscapeLayout'
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'

export default function Skills() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // 가로형 레이아웃 상태 및 최적화 훅 사용
  const { canDisplayGame } = useLandscapeLayout()

  // 토큰 유효성 검증 훅 사용
  useTokenValidation()

  if (!user) {
    navigate('/login')
    return null
  }

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!canDisplayGame) {
    return null // App.tsx에서 처리됨
  }

  return (
    <div className="skills-layout landscape-layout">
      {/* 상단 헤더 */}
      <GameHeader />

      {/* 메인 콘텐츠 - 새로운 가로형 레이아웃 사용 */}
      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="⚔️ 무기 스킬" subtitle="무기별 전투 기술">
            <LandscapeSection title="🗡️ 한손검 스킬">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item available">
                    <span className="item-label">베기</span>
                    <span className="item-value">기본적인 베기 공격</span>
                  </div>
                  <div className="list-item locked">
                    <span className="item-label">급습</span>
                    <span className="item-value">빠른 속도로 공격</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="⚔️ 양손검 스킬">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item locked">
                    <span className="item-label">강타</span>
                    <span className="item-value">강력한 한 방 공격</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="⚔️ 쌍검 스킬">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item locked">
                    <span className="item-label">회전베기</span>
                    <span className="item-value">360도 회전 공격</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
        rightPanel={
          <LandscapeMenuPanel title="🎭 캐릭터 스킬" subtitle="방어 및 공격 기술">
            <LandscapeSection title="🛡️ 방어 스킬">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item available">
                    <span className="item-label">가드</span>
                    <span className="item-value">공격을 막아내는 방어 자세</span>
                  </div>
                  <div className="list-item locked">
                    <span className="item-label">회피</span>
                    <span className="item-value">공격을 피하는 회피 동작</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="🔥 공격 스킬">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item locked">
                    <span className="item-label">분노</span>
                    <span className="item-value">공격력과 공격 속도 증가</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="⭐ 특성">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item active">
                    <span className="item-label">강인함</span>
                    <span className="item-value">체력과 방어력 증가 (레벨 1/5)</span>
                  </div>
                  <div className="list-item inactive">
                    <span className="item-label">민첩함</span>
                    <span className="item-value">공격 속도와 회피율 증가 (레벨 0/5)</span>
                  </div>
                  <div className="list-item inactive">
                    <span className="item-label">지혜</span>
                    <span className="item-value">스킬 효과와 경험치 증가 (레벨 0/5)</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
      >
        {/* 중앙 스킬 정보 영역 */}
        <div className="skills-center-area landscape-center-content">
          <div className="skills-info">
            <h2>✨ 스킬 & 특성</h2>
            <p>무기 스킬과 캐릭터 특성을 관리하여 전투력을 향상시키세요</p>

            <div className="skills-summary">
              <div className="summary-item">
                <span className="summary-label">사용 가능한 스킬:</span>
                <span className="summary-value">2개</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">잠긴 스킬:</span>
                <span className="summary-value">6개</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">활성 특성:</span>
                <span className="summary-value">1개</span>
              </div>
            </div>

            <div className="skills-actions">
              <LandscapeButton
                onClick={() => navigate('/training')}
                variant="primary"
                className="training-btn"
              >
                🏋️ 훈련하러 가기
              </LandscapeButton>
              <LandscapeButton
                onClick={() => navigate('/lobby')}
                variant="secondary"
                className="back-btn"
              >
                🏠 로비로 돌아가기
              </LandscapeButton>
            </div>
          </div>
        </div>
      </LandscapeLayout>
    </div>
  )
}
