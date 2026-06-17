import { create } from 'zustand'
import { zh } from '@shared/i18n/zh'

export type Language = 'zh' | 'en'
export type TranslationDict = typeof zh

// English is the default (keys are English strings)
// Chinese translations are in zh.ts

interface LanguageStore {
  lang: Language
  setLang: (lang: Language) => void
  t: TranslationDict | null // when null, use English (keys)
}

export const useLanguageStore = create<LanguageStore>((set) => ({
  lang: 'zh',
  setLang: (lang) => set({ lang }),
  t: null, // null = use English keys as fallback
}))

/** Hook: returns a translation function */
export function useT() {
  const lang = useLanguageStore((s) => s.lang)
  return function t(key: string): string {
    if (lang === 'en') return key.replace(/_/g, ' ') // Use key as English text with readable format
    // Navigate nested keys like "nav.explore" → zh.nav.explore
    const parts = key.split('.')
    let val: any = zh
    for (const part of parts) {
      val = val?.[part]
    }
    return typeof val === 'string' ? val : key
  }
}
