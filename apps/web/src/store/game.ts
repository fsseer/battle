import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export interface Character {
  id: string
  name: string
  level: number
  exp: number
  stats: {
    str: number
    agi: number
    sta: number
    int: number
    luck: number
    fate: number
  }
  resources: {
    ap: number
    apMax: number
    gold: number
    stress: number
    stressMax: number
  }
  proficiencies: Array<{
    id: string
    kind: string
    level: number
    xp: number
  }>
  traits: Array<{
    id: string
    name: string
    description: string
    active: boolean
  }>
  skills: Array<{
    id: string
    name: string
    description: string
    level: number
    xp: number
  }>
}

export interface GameState {
  character: Character | null
  isLoading: boolean
  error: string | null

  // 액션들
  setCharacter: (character: Character) => void
  updateCharacter: (updates: Partial<Character>) => void
  updateResources: (resources: Partial<Character['resources']>) => void
  updateStats: (stats: Partial<Character['stats']>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  reset: () => void
}

export const useGameStore = create<GameState>()(
  devtools(
    persist(
      (set, get) => ({
        character: null,
        isLoading: false,
        error: null,

        setCharacter: (character) => {
          set({ character, error: null })
        },

        updateCharacter: (updates) => {
          const current = get().character
          if (current) {
            set({ character: { ...current, ...updates } })
          }
        },

        updateResources: (resources) => {
          const current = get().character
          if (current) {
            set({
              character: {
                ...current,
                resources: { ...current.resources, ...resources },
              },
            })
          }
        },

        updateStats: (stats) => {
          const current = get().character
          if (current) {
            set({
              character: {
                ...current,
                stats: { ...current.stats, ...stats },
              },
            })
          }
        },

        setLoading: (loading) => {
          set({ isLoading: loading })
        },

        setError: (error) => {
          set({ error, isLoading: false })
        },

        clearError: () => {
          set({ error: null })
        },

        reset: () => {
          set({ character: null, isLoading: false, error: null })
        },
      }),
      {
        name: 'game-storage',
        partialize: (state) => ({
          character: state.character,
        }),
      }
    ),
    {
      name: 'game-store',
    }
  )
)
