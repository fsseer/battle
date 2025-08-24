export function Hearts({ n, max, size = 16 }: { n: number; max: number; size?: number }) {
  const arr = Array.from({ length: max }, (_, i) => i < n)

  return (
    <div className="row" style={{ gap: 2 }}>
      {arr.map((filled, i) => (
        <div
          key={i}
          className={filled ? 'animate-pulse' : ''}
          style={{
            width: size,
            height: size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size * 0.8,
            color: filled ? '#ef4444' : '#6b7280',
            textShadow: filled ? '0 0 4px #ef4444' : 'none',
            filter: filled ? 'drop-shadow(0 0 2px #ef4444)' : 'none',
            transition: 'all 0.3s ease',
            transform: filled ? 'scale(1)' : 'scale(0.8)',
            opacity: filled ? 1 : 0.5,
          }}
        >
          {filled ? '❤️' : '🖤'}
        </div>
      ))}
      <div
        style={{
          fontSize: size * 0.6,
          color: '#fff',
          marginLeft: '4px',
          fontWeight: 'bold',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        {n}/{max}
      </div>
    </div>
  )
}
