export function SkillButton({ id, label, disabled, onClick }: { id: string; label: string; disabled?: boolean; onClick: (id: string) => void }) {
  return (
    <button
      className={disabled ? 'ghost-btn' : ''}
      disabled={disabled}
      onClick={() => onClick(id)}
      style={{ minWidth: 72 }}
    >
      {label}
    </button>
  )
}


