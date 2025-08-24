import { useAuthStore } from '../store/auth'
import { useState, useEffect } from 'react'

interface GameHeaderProps {
  onSystemMenuClick?: () => void
}

export default function GameHeader({ onSystemMenuClick }: GameHeaderProps) {
  const { user } = useAuthStore()
  const [gameTime, setGameTime] = useState({
    year: 680,
    month: 1,
    day: 1,
    timeOfDay: '아침' as '아침' | '오전' | '오후' | '저녁' | '심야'
  })

  // 사용자 자원 값 (-1로 표시하여 데이터 없음을 나타냄)
  const userAp = user?.ap ?? -1
  const userApMax = user?.apMax ?? 100
  const userStress = user?.stress ?? -1
  const userStressMax = user?.stressMax ?? 100
  const userGold = user?.gold ?? -1

  // 게임 시간 업데이트 (1분마다)
  useEffect(() => {
    const interval = setInterval(() => {
      setGameTime(prev => {
        // 간단한 게임 시간 진행 시스템
        const timeOrder: ('아침' | '오전' | '오후' | '저녁' | '심야')[] = ['아침', '오전', '오후', '저녁', '심야']
        const currentIndex = timeOrder.indexOf(prev.timeOfDay)
        const nextIndex = (currentIndex + 1) % timeOrder.length
        
        if (nextIndex === 0) {
          // 심야에서 아침으로 넘어가면 다음 날
          return {
            ...prev,
            day: prev.day + 1,
            timeOfDay: '아침'
          }
        }
        
        return {
          ...prev,
          timeOfDay: timeOrder[nextIndex]
        }
      })
    }, 60000) // 1분마다 시간 진행

    return () => clearInterval(interval)
  }, [])

  // 시기별 아이콘과 색상
  const getTimeOfDayInfo = (timeOfDay: string) => {
    switch (timeOfDay) {
      case '아침': return { icon: '🌅', color: '#ffd700' }
      case '오전': return { icon: '☀️', color: '#87ceeb' }
      case '오후': return { icon: '🌤️', color: '#ffa500' }
      case '저녁': return { icon: '🌆', color: '#ff8c00' }
      case '심야': return { icon: '🌙', color: '#4169e1' }
      default: return { icon: '⚔️', color: '#ffffff' }
    }
  }

  const timeInfo = getTimeOfDayInfo(gameTime.timeOfDay)

  if (!user) return null

  return (
    <div className="game-header">
      <div className="header-content">
        {/* 좌측: 캐릭터 이름 (닉네임) */}
        <div className="character-info">
          <div className="character-avatar">⚔️</div>
          <div className="character-details">
            <div className="character-name">{user?.nickname || user?.id || '검투사'}</div>
            <div className="character-level">Lv.1</div>
          </div>
        </div>

        {/* 중앙: 게임 시간 정보 */}
        <div className="time-info">
          <div className="date-display">
            AUC {gameTime.year}년 {gameTime.month}월 {gameTime.day}일
          </div>
          <div className="time-of-day" style={{ color: timeInfo.color }}>
            <span className="time-icon">{timeInfo.icon}</span>
            <span className="time-text">{gameTime.timeOfDay}</span>
          </div>
        </div>

        {/* 우측: 주요 자원 및 시스템 메뉴 */}
        <div className="right-section">
          {/* 주요 자원 (AP/스트레스/골드) */}
          <div className="player-resources">
            {/* AP (체력/활력) */}
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

            {/* 스트레스 (피로도) */}
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

            {/* 골드 */}
            <div className="resource-item">
              <div className="resource-icon">⚜️</div>
              <div className="gold-amount">{userGold >= 0 ? userGold : '연결 안됨'}</div>
            </div>
          </div>

          {/* 시스템 메뉴 버튼 */}
          <button className="system-menu-btn" onClick={onSystemMenuClick}>
            <span className="system-icon">⚙️</span>
            <span className="system-label">시스템</span>
          </button>
        </div>
      </div>
    </div>
  )
}
