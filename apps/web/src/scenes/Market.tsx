import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth'
import { getShopCatalog, buyItem, sellItem, getInventory } from '../lib/api'
import { useResourceSync } from '../hooks/useResourceSync'
import GameHeader from '../components/GameHeader'
import LandscapeLayout, {
  LandscapeMenuPanel,
  LandscapeSection,
  LandscapeCard,
  LandscapeButton,
} from '../components/LandscapeLayout'

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
  const categorized = {
    약국: catalog.filter((i) => i.category === 'pharmacy'),
    목공소: catalog.filter((i) => i.category === 'wood'),
    꽃집: catalog.filter((i) => i.category === 'flower'),
  }
  const [gold, setGold] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { syncUserResources } = useResourceSync()

  const sortInventory = (list: any[]) =>
    [...list].sort((a, b) => String(a.name).localeCompare(String(b.name)))

  const [openPharmacy, setOpenPharmacy] = useState(true)
  const [openWood, setOpenWood] = useState(true)
  const [openFlower, setOpenFlower] = useState(true)

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
    <div className="training-layout landscape-layout">
      <GameHeader />
      <div
        className="training-background"
        style={{ backgroundImage: 'url(/images/trainning-background.jpg)' }}
      />
      <LandscapeLayout
        leftPanel={
          <LandscapeMenuPanel title="🛒 시장 - 구매" subtitle="카테고리별 상품">
            <LandscapeSection title="약국">
              <LandscapeCard>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <LandscapeButton variant="secondary" onClick={() => setOpenPharmacy(!openPharmacy)}>
                    {openPharmacy ? '접기' : '펼치기'}
                  </LandscapeButton>
                </div>
                {openPharmacy && (
                  <div className="landscape-grid">
                    {categorized.약국.map((it) => (
                      <div key={it.id} className="landscape-grid-row">
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600 }}>{it.name}</div>
                          <div style={{ color: '#ccc', fontSize: 12 }}>{it.description}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ color: '#ffd700' }}>{it.price} G</span>
                          <LandscapeButton onClick={() => handleBuy(it.id)} variant="primary">
                            구매
                          </LandscapeButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </LandscapeCard>
            </LandscapeSection>
            <LandscapeSection title="목공소">
              <LandscapeCard>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <LandscapeButton variant="secondary" onClick={() => setOpenWood(!openWood)}>
                    {openWood ? '접기' : '펼치기'}
                  </LandscapeButton>
                </div>
                {openWood && (
                  <div className="landscape-grid">
                    {categorized.목공소.map((it) => (
                      <div key={it.id} className="landscape-grid-row">
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600 }}>{it.name}</div>
                          <div style={{ color: '#ccc', fontSize: 12 }}>{it.description}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ color: '#ffd700' }}>{it.price} G</span>
                          <LandscapeButton onClick={() => handleBuy(it.id)} variant="primary">
                            구매
                          </LandscapeButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </LandscapeCard>
            </LandscapeSection>
            <LandscapeSection title="꽃집">
              <LandscapeCard>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                  <LandscapeButton variant="secondary" onClick={() => setOpenFlower(!openFlower)}>
                    {openFlower ? '접기' : '펼치기'}
                  </LandscapeButton>
                </div>
                {openFlower && (
                  <div className="landscape-grid">
                    {categorized.꽃집.map((it) => (
                      <div key={it.id} className="landscape-grid-row">
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600 }}>{it.name}</div>
                          <div style={{ color: '#ccc', fontSize: 12 }}>{it.description}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ color: '#ffd700' }}>{it.price} G</span>
                          <LandscapeButton onClick={() => handleBuy(it.id)} variant="primary">
                            구매
                          </LandscapeButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
        rightPanel={
          <LandscapeMenuPanel title="📦 판매" subtitle="보유 소모품 판매">
            <LandscapeSection title="인벤토리">
              <LandscapeCard>
                {inventory.length === 0 ? (
                  <div style={{ color: '#ccc' }}>보유 소모품이 없습니다.</div>
                ) : (
                  <div className="landscape-grid">
                    {inventory.map((it) => (
                      <div key={it.itemId} className="landscape-grid-row">
                        <div>
                          <div style={{ color: '#fff', fontWeight: 600 }}>
                            {it.name} x{it.quantity}
                          </div>
                          <div style={{ color: '#ccc', fontSize: 12 }}>{it.description}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ color: '#9acd32' }}>{it.sellPrice} G</span>
                          <LandscapeButton
                            onClick={() => handleSell(it.itemId)}
                            variant="secondary"
                          >
                            1개 판매
                          </LandscapeButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </LandscapeCard>
            </LandscapeSection>
          </LandscapeMenuPanel>
        }
      />
    </div>
  )
}
