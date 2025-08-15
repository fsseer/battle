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

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (u) => set({ user: u }),
  clear: () => set({ user: null }),
}))


