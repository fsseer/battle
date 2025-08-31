import type { ReactNode } from 'react'

type Variant = 'default' | 'danger'

export default function ArenaModal({
  title,
  children,
  onClose,
  actions,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  actions?: Array<{ label: string; onClick: () => void; variant?: Variant }>
}) {
  return (
    <div className="system-modal-overlay" onClick={onClose}>
      <div className="system-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-content" style={{ color: '#fff' }}>
          {children}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 12, gap: 8 }}>
          {(actions &&
            actions.map((a, i) => (
              <button
                key={i}
                className={`modal-btn ${a.variant === 'danger' ? 'danger' : ''}`}
                onClick={a.onClick}
              >
                {a.label}
              </button>
            ))) || (
            <button className="modal-btn" onClick={onClose}>
              확인
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
