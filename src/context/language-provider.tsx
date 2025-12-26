import { createContext, useContext, useEffect, useState } from 'react'
import { getCookie, setCookie } from '@/lib/cookies'
import { type Language } from '@/lib/i18n/translations'

const DEFAULT_LANGUAGE: Language = 'zh'
const LANGUAGE_COOKIE_NAME = 'vite-ui-language'
const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

type LanguageProviderProps = {
  children: React.ReactNode
  defaultLanguage?: Language
  storageKey?: string
}

type LanguageProviderState = {
  language: Language
  setLanguage: (language: Language) => void
  resetLanguage: () => void
}

const initialState: LanguageProviderState = {
  language: DEFAULT_LANGUAGE,
  setLanguage: () => null,
  resetLanguage: () => null,
}

const LanguageContext = createContext<LanguageProviderState>(initialState)

export function LanguageProvider({
  children,
  defaultLanguage = DEFAULT_LANGUAGE,
  storageKey = LANGUAGE_COOKIE_NAME,
  ...props
}: LanguageProviderProps) {
  const [language, _setLanguage] = useState<Language>(
    () => (getCookie(storageKey) as Language) || defaultLanguage
  )

  useEffect(() => {
    // Set language attribute on html element for potential CSS-based language switching
    document.documentElement.setAttribute('lang', language)
  }, [language])

  const setLanguage = (lang: Language) => {
    setCookie(storageKey, lang, LANGUAGE_COOKIE_MAX_AGE)
    _setLanguage(lang)
  }

  const resetLanguage = () => {
    setCookie(storageKey, DEFAULT_LANGUAGE, LANGUAGE_COOKIE_MAX_AGE)
    _setLanguage(DEFAULT_LANGUAGE)
  }

  const contextValue = {
    language,
    setLanguage,
    resetLanguage,
  }

  return (
    <LanguageContext.Provider value={contextValue} {...props}>
      {children}
    </LanguageContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLanguage = () => {
  const context = useContext(LanguageContext)

  if (!context) throw new Error('useLanguage must be used within a LanguageProvider')

  return context
}

