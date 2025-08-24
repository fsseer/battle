import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { call, get } from '../lib/api'
import { useResourceSync } from '../hooks/useResourceSync'
import { useTokenValidation } from '../hooks/useTokenValidation'
import GameHeader from '../components/GameHeader'
import TrainingProgressModal from '../components/TrainingProgressModal'
import TrainingResultModal from '../components/TrainingResultModal'
import LandscapeLayout, {
  LandscapeMenuPanel,
  LandscapeSection,
  LandscapeCard,
  LandscapeButton,
} from '../components/LandscapeLayout'
import { useLandscapeLayout } from '../hooks/useLandscapeLayout'
import { TrainingCategory, TrainingSubcategory } from '../components/Training/TrainingCategory'
import type { TrainingResult } from '../components/TrainingProgressModal'

interface TrainingItem {
  id: string
  name: string
  description: string
  category: string
  apCost: number
  goldCost: number
}

export default function Training() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [catalog, setCatalog] = useState<TrainingItem[]>([])
  const [busy, setBusy] = useState(false)

  // 가로형 레이아웃 상태 및 최적화 훅 사용
  const { canDisplayGame } = useLandscapeLayout()

  // 현재 열린 카테고리를 추적하는 단일 상태
  const [openCategory, setOpenCategory] = useState<string | null>(null)
  const [showProgressModal, setShowProgressModal] = useState(false)
  const [showResultModal, setShowResultModal] = useState(false)
  const [currentTraining, setCurrentTraining] = useState<TrainingItem | null>(null)
  const [trainingResult, setTrainingResult] = useState<TrainingResult | null>(null)

  // 공통 자원 동기화 훅 사용
  const { syncUserResources } = useResourceSync()

  // 토큰 유효성 검증 훅 사용
  const { checkToken } = useTokenValidation()

  useEffect(() => {
    if (catalog.length === 0) {
      get('/training/catalog')
        .then((r: any) => {
          if (r.ok) {
            console.log('Training catalog loaded:', r.items)
            setCatalog(r.items)
          } else {
            console.error('Failed to load training catalog:', r)
          }
        })
        .catch((error) => {
          console.error('Error loading training catalog:', error)
        })
    }
  }, [catalog.length])

  // 카테고리 토글 함수
  const toggleCategory = (category: string) => {
    if (openCategory === category) {
      setOpenCategory(null) // 같은 카테고리를 클릭하면 닫기
    } else {
      setOpenCategory(category) // 다른 카테고리를 클릭하면 이전 것을 닫고 새 것을 열기
    }
  }

  const handleCall = async (endpoint: string, data?: { id?: string; type?: string }) => {
    // 자원 소모 전 토큰 유효성 검증
    if (!(await checkToken())) {
      return
    }

    setBusy(true)
    try {
      const response: any = await call(endpoint, data)

      if (response.ok) {
        // 훈련 실행이나 빠른 액션 성공시 서버와 자원 동기화
        if (endpoint === '/training/run' || endpoint === '/training/quick') {
          await syncUserResources()
        }

        if (endpoint === '/training/run') {
          // 훈련 시작 시 프로그레스 모달 표시
          if (data?.id) {
            const trainingItem = catalog.find((item) => item.id === data.id)
            if (trainingItem) {
              setCurrentTraining(trainingItem)
              setShowProgressModal(true)
            }
          }
        } else if (endpoint === '/training/quick') {
          // 빠른 액션 성공 메시지
          if (data?.type) {
            const actionName =
              data.type === 'ap_to_gold' ? 'AP를 골드로 변환' : 'AP로 스트레스 감소'
            alert(`${actionName}이 성공했습니다!`)
          }
        }
      } else {
        // 에러 처리
        if (response.error === 'NOT_ENOUGH_AP') {
          alert('AP가 부족합니다!')
        } else if (response.error === 'NOT_ENOUGH_GOLD') {
          alert('골드가 부족합니다!')
        } else {
          alert(`훈련 실행 실패: ${response.error}`)
        }
      }
    } catch (error) {
      console.error('[Training] API Error:', error)
      alert('API 호출 중 오류가 발생했습니다.')
    } finally {
      setBusy(false)
    }
  }

  // 훈련 완료 핸들러
  const handleTrainingComplete = (result: TrainingResult) => {
    setTrainingResult(result)
    setShowResultModal(true)
    setShowProgressModal(false)

    // 자원 동기화
    syncUserResources()
  }

  if (!user) {
    navigate('/login')
    return null
  }

  // 해상도나 방향이 유효하지 않으면 기본 메시지 표시
  if (!canDisplayGame) {
    return null // App.tsx에서 처리됨
  }

  // 사용자 자원에 대한 기본값 설정
  const userAp = user.ap || 0
  const userGold = user.gold || 0

  return (
    <div className="training-layout landscape-layout">
      {/* 상단 헤더 */}
      <GameHeader />

      {/* 배경 이미지 */}
      <div
        className="training-background"
        style={{ backgroundImage: 'url(/images/trainning-background.jpg)' }}
      />

      {/* 메인 콘텐츠 - 새로운 가로형 레이아웃 사용 */}
      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="📚 훈련 카테고리" subtitle="기초 및 무기술 훈련">
            <LandscapeSection title="💪 기초 훈련">
              <LandscapeCard>
                <div className="training-categories">
                  <TrainingCategory
                    icon="💪"
                    name="기초 훈련"
                    isOpen={openCategory === 'BASIC'}
                    onToggle={() => toggleCategory('BASIC')}
                  >
                    {/* 힘 훈련 */}
                    <TrainingSubcategory
                      icon="💪"
                      name="힘 훈련"
                      items={catalog.filter(
                        (item) => item.category === 'BASIC' && item.name.includes('힘 훈련')
                      )}
                      userAp={userAp}
                      userGold={userGold}
                      busy={busy}
                      onTrainingSelect={(itemId) => handleCall('/training/run', { id: itemId })}
                    />

                    {/* 민첩 훈련 */}
                    <TrainingSubcategory
                      icon="🏃"
                      name="민첩 훈련"
                      items={catalog.filter(
                        (item) => item.category === 'BASIC' && item.name.includes('민첩 훈련')
                      )}
                      userAp={userAp}
                      userGold={userGold}
                      busy={busy}
                      onTrainingSelect={(itemId) => handleCall('/training/run', { id: itemId })}
                    />

                    {/* 지능 훈련 */}
                    <TrainingSubcategory
                      icon="🧠"
                      name="지능 훈련"
                      items={catalog.filter(
                        (item) => item.category === 'BASIC' && item.name.includes('지능 훈련')
                      )}
                      userAp={userAp}
                      userGold={userGold}
                      busy={busy}
                      onTrainingSelect={(itemId) => handleCall('/training/run', { id: itemId })}
                    />
                  </TrainingCategory>

                  <TrainingCategory
                    icon="⚔️"
                    name="무기술 훈련"
                    isOpen={openCategory === 'WEAPON'}
                    onToggle={() => toggleCategory('WEAPON')}
                  >
                    {/* 검술 훈련 */}
                    <TrainingSubcategory
                      icon="🗡️"
                      name="검술 훈련"
                      items={catalog.filter(
                        (item) => item.category === 'WEAPON' && item.name.includes('한손검 훈련')
                      )}
                      userAp={userAp}
                      userGold={userGold}
                      busy={busy}
                      onTrainingSelect={(itemId) => handleCall('/training/run', { id: itemId })}
                    />

                    {/* 양손검 훈련 */}
                    <TrainingSubcategory
                      icon="⚔️"
                      name="양손검 훈련"
                      items={catalog.filter(
                        (item) => item.category === 'WEAPON' && item.name.includes('양손검')
                      )}
                      userAp={userAp}
                      userGold={userGold}
                      busy={busy}
                      onTrainingSelect={(itemId) => handleCall('/training/run', { id: itemId })}
                    />

                    {/* 쌍검 훈련 */}
                    <TrainingSubcategory
                      icon="⚔️"
                      name="쌍검 훈련"
                      items={catalog.filter(
                        (item) => item.category === 'WEAPON' && item.name.includes('쌍검')
                      )}
                      userAp={userAp}
                      userGold={userGold}
                      busy={busy}
                      onTrainingSelect={(itemId) => handleCall('/training/run', { id: itemId })}
                    />
                  </TrainingCategory>
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
        rightPanel={
          <LandscapeMenuPanel title="⚡ 빠른 액션" subtitle="효율적인 자원 관리">
            <LandscapeSection title="⚡ 빠른 액션">
              <LandscapeCard>
                <div className="landscape-grid">
                  <LandscapeButton
                    disabled={busy}
                    onClick={() => handleCall('/training/quick', { type: 'ap_to_gold' })}
                    variant="success"
                  >
                    💪 AP-5 → 골드+10
                  </LandscapeButton>
                  <LandscapeButton
                    disabled={busy}
                    onClick={() => handleCall('/training/quick', { type: 'ap_to_stress' })}
                    variant="secondary"
                  >
                    🧘 AP-2 → 스트레스-5
                  </LandscapeButton>
                </div>
              </LandscapeCard>
            </LandscapeSection>

            <LandscapeSection title="🧭 네비게이션">
              <LandscapeCard>
                <div className="landscape-grid">
                  <LandscapeButton onClick={() => navigate('/lobby')} variant="secondary">
                    🏠 로비로 돌아가기
                  </LandscapeButton>
                  <LandscapeButton onClick={() => navigate('/match')} variant="primary">
                    ⚔️ 전투 매칭
                  </LandscapeButton>
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
      >
        {/* 중앙 훈련 정보 영역 */}
        <div className="training-center-area landscape-center-content">
          <div className="training-info">
            <h2>훈련소</h2>
            <p>좌측에서 훈련을 선택하고, 우측에서 빠른 액션을 사용하세요.</p>
            <div className="resource-display">
              <div className="resource-item">
                <span className="resource-label">AP:</span>
                <span className="resource-value">{userAp}</span>
              </div>
              <div className="resource-item">
                <span className="resource-label">골드:</span>
                <span className="resource-value">{userGold}</span>
              </div>
            </div>
          </div>
        </div>
      </LandscapeLayout>

      {/* 훈련 진행 모달 */}
      <TrainingProgressModal
        isOpen={showProgressModal}
        onClose={() => setShowProgressModal(false)}
        trainingName={currentTraining?.name || ''}
        duration={15} // 15초 훈련
        onComplete={handleTrainingComplete}
      />

      {/* 훈련 결과 모달 */}
      {showResultModal && trainingResult && (
        <TrainingResultModal
          isOpen={showResultModal}
          onClose={() => setShowResultModal(false)}
          result={{
            expGained: trainingResult.expGained,
            stressChange: trainingResult.stressChange,
            success: trainingResult.success,
          }}
          checkpoints={[]}
          trainingName={currentTraining?.name}
          baseExp={0}
        />
      )}
    </div>
  )
}
