import React from 'react'

interface LandscapeLayoutProps {
  leftPanel?: React.ReactNode
  rightPanel?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * 가로형 디스플레이 전용 레이아웃 컴포넌트
 * 좌우 메뉴 패널과 중앙 콘텐츠 영역을 가로형으로 구성
 */
export default function LandscapeLayout({
  leftPanel,
  rightPanel,
  children,
  className = '',
}: LandscapeLayoutProps) {
  return (
    <div className={`landscape-layout ${className}`}>
      {/* 좌측 메뉴 패널 */}
      {leftPanel && <div className="landscape-menu-panel landscape-left-panel">{leftPanel}</div>}

      {/* 중앙 콘텐츠 영역 */}
      <div className="landscape-center-content">{children}</div>

      {/* 우측 메뉴 패널 */}
      {rightPanel && <div className="landscape-menu-panel landscape-right-panel">{rightPanel}</div>}
    </div>
  )
}

/**
 * 가로형 메뉴 패널 컴포넌트
 */
export function LandscapeMenuPanel({
  children,
  className = '',
  title,
  subtitle,
}: {
  children: React.ReactNode
  className?: string
  title?: string
  subtitle?: string
}) {
  return (
    <div className={`landscape-menu-panel ${className}`}>
      {title && <div className="landscape-section-title">{title}</div>}
      {subtitle && <div className="landscape-subtitle">{subtitle}</div>}
      {children}
    </div>
  )
}

/**
 * 가로형 섹션 컴포넌트
 */
export function LandscapeSection({
  children,
  className = '',
  title,
}: {
  children: React.ReactNode
  className?: string
  title?: string
}) {
  return (
    <div className={`landscape-section ${className}`}>
      {title && <div className="landscape-section-title">{title}</div>}
      {children}
    </div>
  )
}

/**
 * 가로형 카드 컴포넌트
 */
export function LandscapeCard({
  children,
  className = '',
  onClick,
  hoverable = true,
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
}) {
  return (
    <div
      className={`landscape-card ${className} ${hoverable ? 'hoverable' : ''}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {children}
    </div>
  )
}

/**
 * 가로형 버튼 컴포넌트
 */
export function LandscapeButton({
  children,
  className = '',
  onClick,
  disabled = false,
  variant = 'primary',
}: {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
}) {
  const variantClasses = {
    primary: 'landscape-btn',
    secondary: 'landscape-btn landscape-btn-secondary',
    danger: 'landscape-btn landscape-btn-danger',
    success: 'landscape-btn landscape-btn-success',
  }

  return (
    <button
      className={`${variantClasses[variant]} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
