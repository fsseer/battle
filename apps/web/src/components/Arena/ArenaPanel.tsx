import type { ReactNode } from 'react'

export function ArenaPanel({
  children,
  title,
  subtitle,
}: {
  children: ReactNode
  title?: string
  subtitle?: string
}) {
  return (
    <div className="landscape-menu-panel">
      {title && <div className="landscape-section-title">{title}</div>}
      {subtitle && <div className="landscape-subtitle">{subtitle}</div>}
      {children}
    </div>
  )
}

export function ArenaSection({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <div className="landscape-section">
      {title && <div className="landscape-section-title">{title}</div>}
      {children}
    </div>
  )
}
