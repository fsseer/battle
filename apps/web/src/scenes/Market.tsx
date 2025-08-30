import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { getShopCatalog, buyItem, sellItem, getInventory } from '../lib/api'
import { useResourceSync } from '../hooks/useResourceSync'
import GameHeader from '../components/GameHeader'

type ShopItem = {
  id: string
  name: string
  description?: string
  category: string
  price: number
  sellPrice?: number
}

export default function Market() {
  const navigate = useNavigate()
  const { user, updateUserResources } = useAuthStore()
  const [catalog, setCatalog] = useState<ShopItem[]>([])
  const [inventory, setInventory] = useState<any[]>([])
  const [gold, setGold] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { syncUserResources } = useResourceSync()

  const sortInventory = (list: any[]) =>
    [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)))

  const load = async () => {
    setLoading(true)
    try {
      const [sync, cat, inv] = await Promise.all([
        syncUserResources(),
        getShopCatalog('market'),
        getInventory(),
      ])
      if (sync?.success && sync.data?.resources?.gold != null) {
        setGold(Number(sync.data.resources.gold))
      }
      if (cat.ok) setCatalog(cat.items as ShopItem[])
      if ((inv as any).ok) {
        const items = ((inv as any).items || []).filter((it: any) => (it?.quantity ?? 0) > 0)
        setInventory(sortInventory(items))
      }
    } catch (e) {
      setError('시장을 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const didInitRef = useRef(false)
  useEffect(() => {
    if (didInitRef.current) return
    didInitRef.current = true
    if (!user) {
      navigate('/login')
      return
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleBuy = async (itemId: string) => {
    const target = catalog.find((x) => x.id === itemId)
    if (gold != null && target && gold < target.price) {
      setError('골드가 부족하여 구매할 수 없습니다.')
      return
    }
    try {
      const res = (await buyItem(itemId, 1)) as any
      if (res?.ok) {
        setGold(res.gold)
        if (updateUserResources) updateUserResources({ gold: res.gold })
        await load()
        setError(null)
      }
    } catch (e) {
      setError('구매에 실패했습니다.')
    }
  }

  const handleSell = async (itemId: string) => {
    try {
      const res = (await sellItem(itemId, 1)) as any
      if (res?.ok) {
        setGold(res.gold)
        if (updateUserResources) updateUserResources({ gold: res.gold })
        // 낙관적 업데이트: 수량 0이면 제거, 그 외 수량 갱신 후 정렬
        setInventory((prev) => {
          const updated = prev
            .map((it) => (it.itemId === itemId ? { ...it, quantity: res.remaining } : it))
            .filter((it) => (it?.quantity ?? 0) > 0)
          return sortInventory(updated)
        })
        // 서버 진실과 최종 동기화
        await load()
        setError(null)
      }
    } catch (e) {
      setError('판매에 실패했습니다.')
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
          <h2 style={{ color: '#fff', textAlign: 'center' }}>시장</h2>
          {gold !== null && <div style={{ color: '#ffd700' }}>보유 골드: {gold}</div>}
          {loading && <div style={{ color: '#fff' }}>불러오는 중...</div>}
          {error && <div style={{ color: 'tomato' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginTop: 12 }}>
            <div>
              <h3 style={{ color: '#fff' }}>구매</h3>
              {catalog.map((it) => (
                <div
                  key={it.id}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600 }}>{it.name}</div>
                      <div style={{ color: '#ccc', fontSize: 12 }}>{it.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#ffd700' }}>{it.price} G</span>
                      <button className="menu-icon-btn" onClick={() => handleBuy(it.id)}>
                        구매
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <h3 style={{ color: '#fff' }}>판매</h3>
              {inventory.length === 0 && (
                <div style={{ color: '#ccc' }}>보유 소모품이 없습니다.</div>
              )}
              {inventory.map((it) => (
                <div
                  key={it.itemId}
                  style={{
                    background: 'rgba(0,0,0,0.5)',
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ color: '#fff', fontWeight: 600 }}>
                        {it.name} x{it.quantity}
                      </div>
                      <div style={{ color: '#ccc', fontSize: 12 }}>{it.description}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ color: '#9acd32' }}>{it.sellPrice} G</span>
                      <button className="menu-icon-btn" onClick={() => handleSell(it.itemId)}>
                        1개 판매
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
