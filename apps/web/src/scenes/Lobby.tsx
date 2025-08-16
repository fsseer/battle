import { useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/auth'
import '../styles/theme.css'
import { useI18n } from '../i18n/useI18n'
import ResourceBar from '../components/ResourceBar'
import { SERVER_ORIGIN } from '../lib/api'

export default function Lobby() {
  const navigate = useNavigate()
  const { user, clear, setUser } = useAuthStore()
  const { t } = useI18n()
  const pollingRef = useRef<number | null>(null)
  const meMetaRef = useRef<any>(null)

  useEffect(() => {
    const token = (user as any)?.token
    if (!token) return
    fetch(`${SERVER_ORIGIN}/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((m) => {
        if (m?.ok) {
          meMetaRef.current = m.meta
          setUser({ id: m.user.id, name: m.user.name, token, characters: m.user.characters })
        }
      })
      .catch(() => {})
  }, [])

  // AP 자동 반영: 주기적으로 /me 폴링
  useEffect(() => {
    const token = (user as any)?.token
    if (!token) return
    if (pollingRef.current) window.clearInterval(pollingRef.current)
    const id = window.setInterval(() => {
      fetch(`${SERVER_ORIGIN}/me`, { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((m) => {
          if (m?.ok) {
            meMetaRef.current = m.meta
            setUser({ id: m.user.id, name: m.user.name, token, characters: m.user.characters })
          }
        })
        .catch(() => {})
    }, 3000) // dev: 3s; prod: can be increased
    pollingRef.current = id
    return () => {
      if (pollingRef.current) window.clearInterval(pollingRef.current)
    }
  }, [(user as any)?.token])

  return (
    <div className="arena-frame">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <div className="title">{t('lobby.title')}</div>
          <img src="/images/laurel.svg" alt="laurel" width={48} height={48} />
        </div>
        <div className="subtitle">{t('lobby.subtitle', { name: user?.name ?? 'Guest' })}</div>

        <div className="parchment">
          <ResourceBar />
          {/* 내 정보 */}
          <h4 style={{ marginTop: 4 }}>내 정보</h4>
          <div className="grid" style={{ gridTemplateColumns: '1.2fr 1fr 1fr', gap: 12 }}>
            {/* 기본 능력치 */}
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>기본 능력치</div>
              <StatPanel metaRef={meMetaRef} />
            </div>
            {/* 장비 */}
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>장비</div>
              <EquipmentPanel />
            </div>
            {/* 무기 숙련도 */}
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>무기 숙련도</div>
              <ProficiencyPanel />
            </div>
          </div>
          <div className="grid">
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('lobby.training.title')}</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>{t('lobby.training.desc')}</div>
              <div className="section">
                <button className="ghost-btn" onClick={() => navigate('/training')}>
                  {t('lobby.training.start')}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('lobby.arena.title')}</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>{t('lobby.arena.desc')}</div>
              <div className="row" style={{ gap: 12, alignItems: 'center' }}>
                <img src="/images/colosseum.svg" alt="colosseum" width={72} height={48} />
                <button className="gold-btn" onClick={() => navigate('/match')}>
                  {t('lobby.arena.queue')}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>{t('lobby.barracks.title')}</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>{t('lobby.barracks.desc')}</div>
              <div className="section">
                <button className="ghost-btn" onClick={() => alert('WIP')}>
                  {t('lobby.barracks.maint')}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>스킬 / 특성</div>
              <div style={{ fontSize: 14, opacity: 0.9 }}>
                현재 장비/숙련/능력치에 따라 사용 가능 여부가 달라집니다.
              </div>
              <div className="section">
                <button className="ghost-btn" onClick={() => navigate('/skills')}>
                  스킬/특성 보기
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="actions section" style={{ justifyContent: 'space-between' }}>
          <button
            className="ghost-btn"
            onClick={() => {
              clear()
              navigate('/login')
            }}
          >
            {t('lobby.logout')}
          </button>
          <button className="gold-btn" onClick={() => navigate('/match')}>
            {t('lobby.quick')}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatPanel({ metaRef }: { metaRef: React.MutableRefObject<any> }) {
  const { user } = useAuthStore()
  const ch = (user as any)?.characters?.[0]
  const meta = metaRef.current
  const rows: Array<[string, number, string]> = [
    ['힘', ch?.str ?? 5, meta?.statDescriptions?.str ?? ''],
    ['민첩', ch?.agi ?? 5, meta?.statDescriptions?.agi ?? ''],
    ['지능', ch?.int ?? 5, meta?.statDescriptions?.int ?? ''],
    ['행운', ch?.luck ?? 5, meta?.statDescriptions?.luck ?? ''],
    ['운명', ch?.fate ?? 0, meta?.statDescriptions?.fate ?? ''],
  ]
  return (
    <div className="column" style={{ gap: 4 }}>
      {rows.map(([name, val, desc]) => (
        <div key={name} className="row" style={{ justifyContent: 'space-between', gap: 8 }}>
          <div>{name}</div>
          <div>
            <b>{val}</b>
          </div>
        </div>
      ))}
      <div className="text-sm" style={{ opacity: 0.85, marginTop: 6 }}>
        - 각 능력치는 경기·대화 판정에 영향합니다. (1 차이가 크게 체감)
      </div>
      <div className="text-sm" style={{ opacity: 0.85 }}>
        - 생명력 기준: 소형 1 / 인간·중형 2 / 대형 3~4 / 초현세 5+
      </div>
    </div>
  )
}

function EquipmentPanel() {
  // Placeholder: 장비 시스템 도입 전까지는 UI 골격만 표시
  return (
    <div className="column" style={{ gap: 6 }}>
      <div className="text-sm" style={{ opacity: 0.85 }}>
        무기: 한손검
      </div>
      <div className="text-sm" style={{ opacity: 0.85 }}>
        방어구: 튜닉
      </div>
      <div className="text-sm" style={{ opacity: 0.85 }}>
        장신구: 없음
      </div>
      <div className="text-sm" style={{ opacity: 0.7 }}>
        슬롯을 클릭하여 교체 (추가 예정)
      </div>
    </div>
  )
}

function ProficiencyPanel() {
  const { user } = useAuthStore()
  const ch = (user as any)?.characters?.[0]
  const list = (ch?.proficiencies ?? []).map((p: any) => `${p.kind}: Lv${p.level} (xp:${p.xp})`)
  return (
    <div className="column" style={{ gap: 6 }}>
      <div className="text-sm" style={{ opacity: 0.85 }}>
        {list.join(' / ') || '기록 없음'}
      </div>
      <div className="text-sm" style={{ opacity: 0.7 }}>
        무기 착용 시 숙련 특성/스킬 자동 적용
      </div>
    </div>
  )
}
