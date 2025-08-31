import { useAuthStore } from '../../store/auth'

export default function HUD({ onSystemMenuClick }: { onSystemMenuClick?: () => void }) {
  const { user } = useAuthStore()
  if (!user) return null

  const userAp = user?.ap ?? -1
  const userApMax = user?.apMax ?? 100
  const userStress = user?.stress ?? -1
  const userStressMax = user?.stressMax ?? 100
  const userGold = user?.gold ?? -1

  return (
    <div className="game-header" style={{ zIndex: 2000 }}>
      <div className="header-content">
        <div className="character-info">
          <div className="character-avatar">⚔️</div>
          <div className="character-details">
            <div className="character-name">{user?.nickname || user?.id || '검투사'}</div>
            <div className="character-level">Lv.1</div>
          </div>
        </div>

        <div className="time-info">
          <div className="date-display">Vindex Arena</div>
          <div className="time-of-day" style={{ color: '#ffd700' }}>
            <span className="time-icon">🏛️</span>
            <span className="time-text">Arena</span>
          </div>
        </div>

        <div className="right-section">
          <div className="player-resources">
            <div className="resource-item">
              <div className="resource-icon">⚔️</div>
              <div className="resource-gauge">
                {userAp >= 0 ? (
                  <>
                    <div className="gauge-background">
                      <div
                        className="gauge-fill ap-gauge"
                        style={{ width: `${(userAp / userApMax) * 100}%` }}
                      ></div>
                    </div>
                    <div className="gauge-text">
                      {userAp}/{userApMax}
                    </div>
                  </>
                ) : (
                  <div className="gauge-text error">연결 안됨</div>
                )}
              </div>
            </div>

            <div className="resource-item">
              <div className="resource-icon">🛡️</div>
              <div className="resource-gauge">
                {userStress >= 0 ? (
                  <>
                    <div className="gauge-background">
                      <div
                        className="gauge-fill stress-gauge"
                        style={{ width: `${(userStress / userStressMax) * 100}%` }}
                      ></div>
                    </div>
                    <div className="gauge-text">
                      {userStress}/{userStressMax}
                    </div>
                  </>
                ) : (
                  <div className="gauge-text error">연결 안됨</div>
                )}
              </div>
            </div>

            <div className="resource-item">
              <div className="resource-icon">⚜️</div>
              <div className="gold-amount">{userGold >= 0 ? userGold : '연결 안됨'}</div>
            </div>
          </div>

          <button className="system-menu-btn" onClick={onSystemMenuClick}>
            <span className="system-icon">⚙️</span>
            <span className="system-label">시스템</span>
          </button>
        </div>
      </div>
    </div>
  )
}
