import type { ReactNode } from 'react'

export default function ArenaCard({
  children,
  hoverable = true,
}: {
  children: ReactNode
  hoverable?: boolean
}) {
  return <div className={`landscape-card ${hoverable ? 'hoverable' : ''}`}>{children}</div>
}
