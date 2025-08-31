export function StatusBar({
  percent,
  variant = 'health',
  label,
}: {
  percent: number
  variant?: 'health' | 'momentum'
  label?: string
}) {
  const cls = variant === 'health' ? 'health-bar' : 'momentum-bar'
  return (
    <div style={{ width: '100%' }}>
      {label && <div style={{ marginBottom: 6 }}>{label}</div>}
      <div className={cls}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, percent))}%`,
            height: '100%',
            background: 'transparent',
          }}
        />
      </div>
    </div>
  )
}
