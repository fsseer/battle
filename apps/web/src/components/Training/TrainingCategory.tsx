import React from 'react'

interface TrainingItem {
  id: string
  name: string
  apCost: number
  goldCost: number
}

interface TrainingCategoryProps {
  icon: string
  name: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

export const TrainingCategory: React.FC<TrainingCategoryProps> = ({
  icon,
  name,
  isOpen,
  onToggle,
  children,
}) => {
  return (
    <div className="training-category-item">
      <div className="category-header" onClick={onToggle}>
        <span className="category-icon">{icon}</span>
        <span className="category-name">{name}</span>
        <span className="category-arrow">{isOpen ? '▼' : '▶'}</span>
      </div>
      {isOpen && <div className="category-content">{children}</div>}
    </div>
  )
}

interface TrainingSubcategoryProps {
  icon: string
  name: string
  items: TrainingItem[]
  userAp: number
  userGold: number
  busy: boolean
  onTrainingSelect: (itemId: string) => void
}

export const TrainingSubcategory: React.FC<TrainingSubcategoryProps> = ({
  icon,
  name,
  items,
  userAp,
  userGold,
  busy,
  onTrainingSelect,
}) => {
  return (
    <div className="training-subcategory">
      <div className="subcategory-header">
        <span className="subcategory-icon">{icon}</span>
        <span className="subcategory-name">{name}</span>
      </div>
      <div className="training-buttons">
        {items.map((item) => {
          const isAvailable = item.apCost <= userAp && item.goldCost <= userGold
          const level = item.name.includes('초급')
            ? '초급'
            : item.name.includes('중급')
            ? '중급'
            : '고급'

          return (
            <button
              key={item.id}
              className={`training-level-btn ${isAvailable ? 'available' : 'unavailable'}`}
              disabled={busy || !isAvailable}
              onClick={() => onTrainingSelect(item.id)}
            >
              <div className="btn-level">{level}</div>
              <div className="btn-costs">
                <span className="cost-item">AP {item.apCost}</span>
                <span className="cost-item">골드 {item.goldCost}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

interface QuickActionProps {
  icon: string
  text: string
  disabled: boolean
  onClick: () => void
}

export const QuickAction: React.FC<QuickActionProps> = ({ icon, text, disabled, onClick }) => {
  return (
    <button className="quick-action-btn" disabled={disabled} onClick={onClick}>
      <span className="action-icon">{icon}</span>
      <span className="action-text">{text}</span>
    </button>
  )
}

interface NavigationButtonProps {
  icon: string
  text: string
  onClick: () => void
}

export const NavigationButton: React.FC<NavigationButtonProps> = ({ icon, text, onClick }) => {
  return (
    <button className="nav-btn" onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span className="nav-text">{text}</span>
    </button>
  )
}
