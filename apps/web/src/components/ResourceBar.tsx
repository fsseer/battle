import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/auth'

export default function ResourceBar() {
  const { user, setUser } = useAuthStore()
  const token = (user as any)?.token as string | undefined
  const pollingRef = useRef<number | null>(null)

  useEffect(() => {
    if (!token) return
    if (pollingRef.current) window.clearInterval(pollingRef.current)
    const id = window.setInterval(() => {
      fetch('http://127.0.0.1:5174/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then((m) => {
          if (m?.ok) setUser({ id: m.user.id, name: m.user.name, token, characters: m.user.characters })
        })
        .catch(() => {})
    }, 3000)
    pollingRef.current = id
    return () => { if (pollingRef.current) window.clearInterval(pollingRef.current) }
  }, [token, setUser])

  if (!user) return null

  const ch = (user as any)?.characters?.[0]
  return (
    <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 8, gap: 16 }}>
      <span className="text-sm" style={{ opacity: .9 }}>AP: <b>{ch?.ap ?? '—'}</b>/100</span>
      <span className="text-sm" style={{ opacity: .9 }}>Gold: <b>{ch?.gold ?? 0}</b></span>
      <span className="text-sm" style={{ opacity: .9 }}>Stress: <b>{ch?.stress ?? 0}</b></span>
    </div>
  )
}


