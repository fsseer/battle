import type { ReactNode } from 'react'
import GameHeader from './GameHeader'

interface OutGameLayoutProps {
  children: ReactNode
  backgroundImage?: string
}

export default function OutGameLayout({
  children,
  backgroundImage,
}: OutGameLayoutProps) {
  return (
    <div className="outgame-layout">
      {/* 상단 바 */}
      <GameHeader />

      {/* 메인 콘텐츠 영역 */}
      <div className="main-content-area">
        {/* 배경 이미지 */}
        {backgroundImage && (
          <div
            className="background-image"
            style={{ backgroundImage: `url(${backgroundImage})` }}
          />
        )}

        {/* 콘텐츠 오버레이 */}
        <div className="content-overlay">{children}</div>
      </div>
    </div>
  )
}
