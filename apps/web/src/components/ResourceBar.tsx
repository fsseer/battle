import { useAuthStore } from '../store/auth'

export default function ResourceBar() {
  const { user } = useAuthStore()
  const ch = (user as any)?.characters?.[0]

  if (!ch) return null

  return (
    <div className="game-hud" style={{ marginBottom: 16 }}>
      <div
        className="row"
        style={{ justifyContent: 'space-between', alignItems: 'center', gap: 16 }}
      >
        {/* 캐릭터 정보 */}
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <div
            style={{
              background: 'linear-gradient(135deg, #805ad5, #b794f4)',
              padding: '4px 8px',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            👤 {user?.name || 'Unknown'}
          </div>
          <div
            style={{
              background: 'linear-gradient(135deg, #38a169, #68d391)',
              padding: '4px 8px',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 'bold',
              fontSize: '12px',
            }}
          >
            🏆 Lv.{ch.level || 1}
          </div>
        </div>

        {/* 주요 자원들 */}
        <div className="row" style={{ gap: 16, alignItems: 'center' }}>
          {/* AP */}
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>⚡</span>
            <div
              style={{
                background: 'linear-gradient(135deg, #2d3748, #4a5568)',
                padding: '4px 8px',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '12px',
                minWidth: '60px',
                textAlign: 'center',
              }}
            >
              {ch.ap || 0}/100
            </div>
          </div>

          {/* 골드 */}
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>💰</span>
            <div
              style={{
                background: 'linear-gradient(135deg, #d69e2e, #f6e05e)',
                padding: '4px 8px',
                borderRadius: '6px',
                color: '#2d3748',
                fontWeight: 'bold',
                fontSize: '12px',
                minWidth: '80px',
                textAlign: 'center',
              }}
            >
              {ch.gold || 0}
            </div>
          </div>

          {/* 스트레스 */}
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>😰</span>
            <div
              style={{
                background: 'linear-gradient(135deg, #e53e3e, #fc8181)',
                padding: '4px 8px',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '12px',
                minWidth: '60px',
                textAlign: 'center',
              }}
            >
              {ch.stress || 0}/100
            </div>
          </div>

          {/* 경험치 */}
          <div className="row" style={{ gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: '16px' }}>⭐</span>
            <div
              style={{
                background: 'linear-gradient(135deg, #805ad5, #b794f4)',
                padding: '4px 8px',
                borderRadius: '6px',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '12px',
                minWidth: '80px',
                textAlign: 'center',
              }}
            >
              XP: {ch.xp || 0}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
