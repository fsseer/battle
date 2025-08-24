import React from 'react'

interface MenuPanelProps {
  position: 'left' | 'right'
  children: React.ReactNode
  className?: string
}

export const MenuPanel: React.FC<MenuPanelProps> = ({ position, children, className = '' }) => {
  const baseClasses = 'menu-panel'
  const positionClasses = position === 'left' ? 'menu-panel-left' : 'menu-panel-right'

  return <div className={`${baseClasses} ${positionClasses} ${className}`}>{children}</div>
}

interface MenuSectionProps {
  title: string
  children: React.ReactNode
  className?: string
}

export const MenuSection: React.FC<MenuSectionProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`menu-section ${className}`}>
      <h3 className="section-title">{title}</h3>
      {children}
    </div>
  )
}

interface StatusGridProps {
  items: Array<{
    label: string
    value: string | number
    className?: string
  }>
}

export const StatusGrid: React.FC<StatusGridProps> = ({ items }) => {
  return (
    <div className="status-grid">
      {items.map((item, index) => (
        <div key={index} className={`status-item ${item.className || ''}`}>
          <span className="status-label">{item.label}</span>
          <span className="status-value">{item.value}</span>
        </div>
      ))}
    </div>
  )
}

interface ListItemProps {
  label: string
  value: string
  status?: 'available' | 'locked' | 'active' | 'inactive'
  className?: string
}

export const ListItem: React.FC<ListItemProps> = ({ label, value, status, className = '' }) => {
  const statusClass = status ? `status-${status}` : ''

  return (
    <div className={`list-item ${statusClass} ${className}`}>
      <span className="item-label">{label}</span>
      <span className="item-value">{value}</span>
      {status && (
        <span className={`item-status ${statusClass}`}>
          {status === 'available' && '사용 가능'}
          {status === 'locked' && '잠김'}
          {status === 'active' && '활성'}
          {status === 'inactive' && '비활성'}
        </span>
      )}
    </div>
  )
}

interface SystemButtonProps {
  icon: string
  text: string
  onClick: () => void
  variant?: 'settings' | 'help' | 'logout'
  className?: string
}

export const SystemButton: React.FC<SystemButtonProps> = ({
  icon,
  text,
  onClick,
  variant = 'default',
  className = '',
}) => {
  const variantClass = variant !== 'default' ? `system-btn-${variant}` : ''

  return (
    <button className={`system-btn ${variantClass} ${className}`} onClick={onClick}>
      {icon} {text}
    </button>
  )
}
