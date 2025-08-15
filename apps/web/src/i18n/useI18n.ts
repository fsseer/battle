import { create } from 'zustand'
import { Language, translations } from './locales'

type I18nState = {
  lang: Language
  setLang: (l: Language) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

export const useI18n = create<I18nState>((set, get) => ({
  lang: 'ko',
  setLang: (l) => set({ lang: l }),
  t: (key, vars) => {
    const { lang } = get()
    const dict = translations[lang] ?? {}
    let text = dict[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
      }
    }
    return text
  },
}))


