import {
  defaultLanguage,
  isSupportedLanguage,
  LANGUAGE_PREFERENCE_STORAGE_KEY,
  type LanguagePreference,
} from './languages'

export function getStoredLanguagePreference(): LanguagePreference {
  const value = window.localStorage.getItem(LANGUAGE_PREFERENCE_STORAGE_KEY)

  if (value === 'system' || (value && isSupportedLanguage(value))) {
    return value
  }

  return 'system'
}

export function setStoredLanguagePreference(preference: LanguagePreference) {
  window.localStorage.setItem(LANGUAGE_PREFERENCE_STORAGE_KEY, preference)
}

export function getSafeInitialLanguagePreference(): LanguagePreference {
  if (typeof window === 'undefined') {
    return defaultLanguage
  }

  return getStoredLanguagePreference()
}
