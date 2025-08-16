export function Hearts({ n, max, size = 12 }: { n: number; max: number; size?: number }) {
  const arr = Array.from({ length: max }, (_, i) => i < n)
  return (
    <div className="row" style={{ gap: 4 }}>
      {arr.map((filled, i) => (
        <div
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: 2,
            background: filled ? '#d33' : 'transparent',
            border: '1px solid #d33',
          }}
        />
      ))}
    </div>
  )
}


