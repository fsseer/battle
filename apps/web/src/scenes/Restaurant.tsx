import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { getShopCatalog, buyItem } from '../lib/api'
import { useResourceSync } from '../hooks/useResourceSync'
import GameHeader from '../components/GameHeader'
import GameModal from '../components/common/GameModal'

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
      }
    } catch (e) {
      setModalMsg('구매에 실패했습니다.')
    }
  }

  return (
    <div className="lobby-layout">
      <GameHeader onSystemMenuClick={() => {}} />
      <div
        className="lobby-background"
        style={{ backgroundImage: 'url(/images/lobby-background.jpg)' }}
      />
      <div className="center-content-wrapper">
        <div className="center-background-area">
          <h2 style={{ color: '#fff', textAlign: 'center' }}>식당</h2>
          {gold !== null && <div style={{ color: '#ffd700' }}>보유 골드: {gold}</div>}
          {loading && <div style={{ color: '#fff' }}>불러오는 중...</div>}
          {error && <div style={{ color: 'tomato' }}>{error}</div>}
          <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
            {items.map((it) => (
              <div
                key={it.id}
                style={{ background: 'rgba(0,0,0,0.5)', padding: 12, borderRadius: 8 }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <div>
                    <div style={{ color: '#fff', fontWeight: 600 }}>{it.name}</div>
                    <div style={{ color: '#ccc', fontSize: 12 }}>{it.description}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ color: '#ffd700' }}>{it.price} G</span>
                    <button
                      className="menu-icon-btn"
                      disabled={gold != null && gold < it.price}
                      onClick={() => handleBuy(it.id)}
                    >
                      구매
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {modalMsg && (
        <GameModal title="알림" onClose={() => setModalMsg(null)}>
          {modalMsg}
        </GameModal>
      )}
    </div>
  )
}
