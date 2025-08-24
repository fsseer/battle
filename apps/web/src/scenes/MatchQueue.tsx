import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { useLandscapeEnforcement } from '../utils/orientation'
import GameHeader from '../components/GameHeader'
import LandscapeLayout, {
  LandscapeMenuPanel,
  LandscapeSection,
  LandscapeCard,
  LandscapeButton,
} from '../components/LandscapeLayout'
import { socket } from '../lib/socket'

export default function MatchQueue() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [status] = useState<{ state: string; position?: number; size?: number } | null>(null)

  // 가로형 레이아웃 상태 및 최적화 훅 사용
  const { isLandscape } = useLandscapeEnforcement()

  // 토큰 유효성 검증 훅 사용
  // useTokenValidation() // This import was removed, so this line is removed.

  useEffect(() => {
    if (!user?.token) {
      navigate('/login')
      return
    }

    // 매치 찾기 시작
    socket.emit('match.find', {})
    console.log('[MatchQueue] 매치 찾기 시작')

    return () => {
      socket.emit('match.cancel')
      console.log('[MatchQueue] 매치 찾기 취소')
    }
  }, [user, navigate])

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!isLandscape) {
    return (
      <div className="match-queue-layout landscape-layout">
        <GameHeader />
        <div className="loading-content landscape-center-content">
          <div className="landscape-spinner">⚔️</div>
          <div className="landscape-loading-text">가로형 화면으로 전환해주세요</div>
        </div>
      </div>
    )
  }

  return (
    <div className="match-queue-layout landscape-layout">
      {/* 상단 헤더 */}
      <GameHeader />

      {/* 메인 콘텐츠 - 새로운 가로형 레이아웃 사용 */}
      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="⚔️ 매칭 상태" subtitle="현재 대기 상황">
            <LandscapeSection title="📊 대기 정보">
              <LandscapeCard>
                {status?.state === 'WAITING' ? (
                  <div className="landscape-status-grid">
                    <div className="status-item">
                      <span className="status-label">대기 순서</span>
                      <span className="status-value">{status.position}번째</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">전체 대기</span>
                      <span className="status-value">{status.size}명</span>
                    </div>
                    <div className="status-item">
                      <span className="status-label">진행률</span>
                      <span className="status-value">
                        {status.position && status.size
                          ? Math.round((status.position / status.size) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="connecting-status">
                    <div className="landscape-spinner">⚔️</div>
                    <p>서버에 연결 중...</p>
                  </div>
                )}
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="💡 검투사 팁">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">매칭 완료</span>
                    <span className="item-value">상대방 정보 확인 가능</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">전투 준비</span>
                    <span className="item-value">장비와 스킬 점검</span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">승리 전략</span>
                    <span className="item-value">용기와 전략으로 승리</span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
        rightPanel={
          <LandscapeMenuPanel title="🎮 게임 액션" subtitle="매칭 및 이동">
            <LandscapeSection title="🏛️ 로비 이동">
              <LandscapeCard>
                <LandscapeButton
                  onClick={() => navigate('/lobby')}
                  variant="secondary"
                  className="back-btn"
                >
                  🏛️ 로비로 돌아가기
                </LandscapeButton>
                <p className="action-hint">매칭을 취소하고 로비로 돌아갑니다</p>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="⚔️ 전투 준비">
              <LandscapeCard>
                <div className="landscape-list">
                  <div className="list-item">
                    <span className="item-label">현재 상태</span>
                    <span className="item-value">
                      {status?.state === 'WAITING' ? '대기 중' : '연결 중'}
                    </span>
                  </div>
                  <div className="list-item">
                    <span className="item-label">예상 대기</span>
                    <span className="item-value">
                      {status?.position && status?.size
                        ? `${Math.max(1, status.size - status.position)}명 앞`
                        : '계산 중'}
                    </span>
                  </div>
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
      >
        {/* 중앙 매칭 정보 영역 */}
        <div className="matching-center-area landscape-center-content">
          <div className="matching-info">
            <div className="gladiator-icon">⚔️</div>
            <h2>검투장 입장 대기</h2>
            <p className="matching-subtitle">용감한 검투사가 나타날 때까지 기다립니다...</p>

            {status?.state === 'WAITING' ? (
              <div className="queue-progress">
                <div className="progress-info">
                  <span className="progress-text">
                    {status.position}번째 / {status.size}명
                  </span>
                </div>
                <div className="landscape-progress">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${
                        status.position && status.size ? (status.position / status.size) * 100 : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="connecting-status">
                <div className="landscape-spinner">⚔️</div>
                <p>서버에 연결 중...</p>
              </div>
            )}

            <div className="matching-actions">
              <LandscapeButton
                onClick={() => navigate('/lobby')}
                variant="secondary"
                className="ghost-btn"
              >
                🏛️ 로비로 돌아가기
              </LandscapeButton>
            </div>
          </div>
        </div>
      </LandscapeLayout>
    </div>
  )
}
