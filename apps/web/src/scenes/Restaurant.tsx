import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { getShopCatalog, buyItem } from '../lib/api'
import { useResourceSync } from '../hooks/useResourceSync'
import GameHeader from '../components/GameHeader'
import GameModal from '../components/common/GameModal'
import LandscapeLayout, { LandscapeMenuPanel, LandscapeSection, LandscapeCard, LandscapeButton } from '../components/LandscapeLayout'

type ShopItem = {
  id: string
  name: string
  description?: string
  category: string
  price: number
}

export default function Restaurant() {
  const navigate = useNavigate()
  const { user, updateUserResources } = useAuthStore()
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gold, setGold] = useState<number | null>(null)
  const { syncUserResources } = useResourceSync()
  const [modalMsg, setModalMsg] = useState<string | null>(null)
  // 식당은 인벤토리를 표시/관리하지 않습니다

  const didInitRef = useRef(false)
  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true
    if (!user) {
      navigate('/login')
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        const synced = await syncUserResources()
        if (synced?.success && synced.data?.resources?.gold != null) {
          setGold(Number(synced.data.resources.gold))
        }
        const res = await getShopCatalog('restaurant')
        if (res.ok) setItems(res.items as ShopItem[])
        // 인벤토리 연동 없음 (즉시 소비 컨셉)
      } catch (e) {
        setError('식당 메뉴를 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    })()
    // 의도적으로 빈 의존성 배열: 마운트 1회만 로드 (루프 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBuy = async (itemId: string) => {
    const target = items.find((x) => x.id === itemId)
    if (gold != null && target && gold < target.price) {
      setModalMsg('골드가 부족하여 구매할 수 없습니다.')
      return
    }
    try {
      const res = (await buyItem(itemId, 1)) as any
      if (res?.ok) {
        setGold(res.gold)
        if (updateUserResources) updateUserResources({ gold: res.gold })
        const synced = await syncUserResources()
        if (synced?.success && synced.data?.resources?.gold != null) {
          setGold(Number(synced.data.resources.gold))
        }
        setModalMsg('구매했습니다!')
        // 인벤토리 갱신 없음 (즉시 소비)
      }
    } catch (e) {
      setModalMsg('구매에 실패했습니다.')
    }
  }

  return (
    <div className="training-layout landscape-layout">
      <GameHeader />
      <div
        className="training-background"
        style={{ backgroundImage: 'url(/images/lobby-background.jpg)' }}
      />
      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="🍽️ 식당 - 저녁 배식" subtitle="훈련 전후 식사를 선택">
            <LandscapeSection title="메뉴">
              <LandscapeCard>
                <div className="landscape-grid">
                  {items.map((it) => (
                    <div key={it.id} className="landscape-grid-row">
                      <div>
                        <div style={{ color: '#fff', fontWeight: 600 }}>{it.name}</div>
                        <div style={{ color: '#ccc', fontSize: 12 }}>{it.description}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ color: '#ffd700' }}>{it.price} G</span>
                        <LandscapeButton
                          disabled={gold != null && gold < it.price}
                          onClick={() => handleBuy(it.id)}
                          variant="primary"
                        >
                          주문
                        </LandscapeButton>
                      </div>
                    </div>
                  ))}
                </div>
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
        rightPanel={
          <LandscapeMenuPanel title="ℹ️ 식사 안내" subtitle="로마 검투사 식단">
            <LandscapeSection title="오늘의 배식">
              <LandscapeCard>
                <p style={{ color: '#ccc' }}>
                  노예단은 저녁마다 보리·콩 죽과 보리빵을 배식받습니다. 주인의 허락이 있는 날엔
                  염장육과 치즈, 포도주가 곁들여집니다.
                </p>
                <div className="resource-display">
                  <div className="resource-item">
                    <span className="resource-label">골드:</span>
                    <span className="resource-value">{gold ?? 0}</span>
                  </div>
                </div>
                {loading && <div style={{ color: '#fff' }}>불러오는 중...</div>}
                {error && <div style={{ color: 'tomato' }}>{error}</div>}
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
      >
        <div className="training-center-area landscape-center-content">
          <div className="training-info">
            <h2>식당</h2>
            <p>훈련으로 지친 몸을 달래고, 내일을 준비하세요.</p>
          </div>
        </div>
      </LandscapeLayout>
      {modalMsg && (
        <GameModal title="알림" onClose={() => setModalMsg(null)}>
          {modalMsg}
        </GameModal>
      )}
    </div>
  )
}
