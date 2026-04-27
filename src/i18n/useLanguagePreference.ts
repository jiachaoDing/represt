import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  resolveLanguagePreference,
  resolveSystemLanguage,
  type LanguagePreference,
  type SupportedLanguage,
} from './languages'
import { getStoredLanguagePreference, setStoredLanguagePreference } from './storage'

export function useLanguagePreference() {
  const { i18n } = useTranslation()
  const [preference, setPreferenceState] = useState<LanguagePreference>(() =>
    getStoredLanguagePreference(),
  )
  const resolvedLanguage = i18n.resolvedLanguage as SupportedLanguage

  useEffect(() => {
    if (preference !== 'system') {
      return
    }

    function handleLanguageChange() {
      void i18n.changeLanguage(resolveSystemLanguage())
    }

    window.addEventListener('languagechange', handleLanguageChange)
    return () => window.removeEventListener('languagechange', handleLanguageChange)
  }, [i18n, preference])

  function setPreference(nextPreference: LanguagePreference) {
    setStoredLanguagePreference(nextPreference)
    setPreferenceState(nextPreference)
    void i18n.changeLanguage(resolveLanguagePreference(nextPreference))
  }

  return {
    preference,
    resolvedLanguage,
    setPreference,
  }
}
