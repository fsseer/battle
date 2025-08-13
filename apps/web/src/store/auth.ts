import { create } from 'zustand'

type User = { id: string, name: string }

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


