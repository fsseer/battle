import { useEffect, useState } from 'react'

export default function PageFade({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(t)
  }, [])

  return <div className={mounted ? 'page-fade-enter-active' : 'page-fade-enter'}>{children}</div>
}
