import type { ReactNode } from 'react'
import HUD from './HUD'

interface ArenaLayoutProps {
  children: ReactNode
  left?: ReactNode
  right?: ReactNode
  backgroundImage?: string
  className?: string
  onSystemMenuClick?: () => void
  centerFull?: boolean
  footer?: ReactNode
}

/**
 * Arena 전역 레이아웃: 상단 HUD + (좌/중앙/우) + 배경 이미지
 * 기존 OutGameLayout/ LandscapeLayout 스타일을 통합하여 사용
 */
export default function ArenaLayout({
  children,
  left,
  right,
  backgroundImage,
  className = '',
  onSystemMenuClick,
  centerFull = false,
  footer,
}: ArenaLayoutProps) {
  return (
    <div className={`outgame-layout ${className}`}>
      <HUD onSystemMenuClick={onSystemMenuClick} />

      <div className="main-content-area">
        {backgroundImage && (
          <div
            className="background-image"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}

        <div className="content-overlay">
          <div className="landscape-layout">
            {left && <div className="landscape-left-panel">{left}</div>}
            <div className={`landscape-center-content ${centerFull ? 'center-full' : ''}`}>
              {children}
            </div>
            {right && <div className="landscape-right-panel">{right}</div>}
          </div>
          {footer}
        </div>
      </div>
    </div>
  )
}
