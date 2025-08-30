import { ReactNode } from 'react'

export default function GameModal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="system-modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(2px)' }}>
      <div className="system-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
        </div>
        <div className="modal-content" style={{ color: '#fff' }}>{children}</div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
          <button className="modal-btn" onClick={onClose}>확인</button>
        </div>
      </div>
    </div>
  )
}
