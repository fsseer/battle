export function SkillButton({
  id,
  label,
  disabled,
  onClick,
}: {
  id: string
  label: string
  disabled?: boolean
  onClick: (id: string) => void
}) {
  // 스킬별 아이콘과 색상 정의
  const getSkillStyle = (skillId: string) => {
    switch (skillId) {
      case 'light':
        return { icon: '⚡', color: '#fbbf24', bgColor: '#92400e' }
      case 'heavy':
        return { icon: '💥', color: '#ef4444', bgColor: '#991b1b' }
      case 'poke':
        return { icon: '🎯', color: '#10b981', bgColor: '#065f46' }
      case 'block':
        return { icon: '🛡️', color: '#3b82f6', bgColor: '#1e40af' }
      case 'dodge':
        return { icon: '🌀', color: '#8b5cf6', bgColor: '#5b21b6' }
      case 'counter':
        return { icon: '⚔️', color: '#f59e0b', bgColor: '#92400e' }
      default:
        return { icon: '❓', color: '#6b7280', bgColor: '#374151' }
    }
  }

  const skillStyle = getSkillStyle(id)
  const isAttack = ['light', 'heavy', 'poke'].includes(id)

  return (
    <button
      className={`skill-btn ${disabled ? 'disabled' : ''}`}
      disabled={disabled}
      onClick={() => onClick(id)}
      style={{
        minWidth: 80,
        background: disabled
          ? 'linear-gradient(135deg, #4a5568, #2d3748)'
          : `linear-gradient(135deg, ${skillStyle.bgColor}, ${skillStyle.color})`,
        borderColor: disabled ? '#718096' : skillStyle.color,
        color: '#fff',
        fontWeight: 600,
        fontSize: '12px',
        padding: '8px 12px',
        borderRadius: '8px',
        border: `2px solid ${disabled ? '#718096' : skillStyle.color}`,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
        boxShadow: disabled
          ? '0 2px 4px rgba(0,0,0,0.2)'
          : `0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px ${skillStyle.color}40`,
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-2px) scale(1.05)'
          e.currentTarget.style.boxShadow = `0 6px 12px rgba(0,0,0,0.4), 0 0 0 2px ${skillStyle.color}60`
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0) scale(1)'
          e.currentTarget.style.boxShadow = `0 4px 8px rgba(0,0,0,0.3), 0 0 0 1px ${skillStyle.color}40`
        }
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
        <span style={{ fontSize: '16px' }}>{skillStyle.icon}</span>
        <span>{label}</span>
        <div
          style={{
            fontSize: '10px',
            opacity: 0.8,
            padding: '1px 4px',
            borderRadius: '4px',
            background: isAttack ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.2)',
            border: `1px solid ${isAttack ? '#ef4444' : '#3b82f6'}40`,
          }}
        >
          {isAttack ? '공격' : '방어'}
        </div>
      </div>
    </button>
  )
}
