export function MomentumBar({ value, width = 160 }: { value: number; width?: number }) {
  const pct = Math.max(0, Math.min(1, (value + 2) / 4)) * 100
  return (
    <div style={{ width, height: 10, background: '#e5e5e5', borderRadius: 6, overflow: 'hidden' }}>
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          background: value >= 0 ? '#c28f2c' : '#5773c6',
          transition: 'width 120ms',
        }}
      />
    </div>
  )
}


