import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { getShopCatalog, buyItem } from '../lib/api'
import { useResourceSync } from '../hooks/useResourceSync'
import GameHeader from '../components/GameHeader'

type ShopItem = {
  id: string
  name: string
  description?: string
  category: string
  price: number
}

export default function Restaurant() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [items, setItems] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gold, setGold] = useState<number | null>(null)
  const { syncUserResources } = useResourceSync()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    ;(async () => {
      try {
        setLoading(true)
        // 진입 시 1회 자원 싱크
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
  }, [user, navigate, syncUserResources])

  const handleBuy = async (itemId: string) => {
    const target = items.find((x) => x.id === itemId)
    if (gold != null && target && gold < target.price) {
      alert('골드가 부족하여 구매할 수 없습니다.')
      return
    }
    try {
      const res = (await buyItem(itemId, 1)) as any
      if (res?.ok) {
        setGold(res.gold)
        alert('구매했습니다!')
      }
    } catch (e) {
      alert('구매에 실패했습니다.')
    }
  }

  return (
    <div className="lobby-layout">
      <GameHeader onSystemMenuClick={() => {}} />
      <div className="center-content-wrapper">
        <div className="center-background-area">
          <h2 style={{ color: '#fff' }}>식당</h2>
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
    </div>
  )
}
