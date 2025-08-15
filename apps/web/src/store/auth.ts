import { create } from 'zustand'

export type Character = {
  id: string
  name: string
  level: number
  stats: { str: number; agi: number; sta: number }
}

export type User = { id: string; name: string; token?: string; characters?: Character[] }

type AuthState = {
  user: User | null
  setUser: (u: User) => void
  clear: () => void
}

function loadFromStorage(): User | null {
  try {
    const raw = localStorage.getItem('auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.user ?? null
  } catch { return null }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadFromStorage(),
  setUser: (u) => {
    try { localStorage.setItem('auth', JSON.stringify({ user: u })) } catch {}
    set({ user: u })
  },
  clear: () => {
    try { localStorage.removeItem('auth') } catch {}
    set({ user: null })
  },
}))


