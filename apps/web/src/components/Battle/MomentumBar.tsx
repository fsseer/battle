export function MomentumBar({ value, width = 160 }: { value: number; width?: number }) {
  const pct = Math.max(0, Math.min(1, (value + 2) / 4)) * 100
  const isPositive = value >= 0

  return (
    <div
      style={{
        width,
        height: 16,
        background: 'linear-gradient(135deg, #2d3748, #4a5568)',
        borderRadius: 8,
        overflow: 'hidden',
        border: '2px solid #4a5568',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)',
        position: 'relative',
      }}
    >
      <div
        className={isPositive ? 'momentum-bar' : ''}
        style={{
          width: `${pct}%`,
          height: '100%',
          background: isPositive
            ? 'linear-gradient(90deg, #805ad5, #b794f4, #d6bcfa)'
            : 'linear-gradient(90deg, #5773c6, #7c9cff, #a3bffa)',
          transition: 'width 120ms ease-out',
          position: 'relative',
          boxShadow: isPositive ? '0 0 8px rgba(128,90,213,0.6)' : '0 0 8px rgba(87,115,198,0.6)',
        }}
      />

      {/* 모멘텀 값 표시 */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#fff',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
          zIndex: 1,
        }}
      >
        {value > 0 ? `+${value}` : value}
      </div>

      {/* 빛나는 효과 */}
      {isPositive && pct > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '100%',
            width: '100%',
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
            animation: 'momentumGlow 1.5s infinite',
            zIndex: 0,
          }}
        />
      )}
    </div>
  )
}
