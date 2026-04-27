export const LANGUAGE_PREFERENCE_STORAGE_KEY = 'trainre.languagePreference'

export const supportedLanguages = ['zh-CN', 'en'] as const

export type SupportedLanguage = (typeof supportedLanguages)[number]
export type LanguagePreference = 'system' | SupportedLanguage

export const defaultLanguage: SupportedLanguage = 'zh-CN'

export function isSupportedLanguage(value: string): value is SupportedLanguage {
  return supportedLanguages.includes(value as SupportedLanguage)
}

export function resolveLanguageFromTag(languageTag: string): SupportedLanguage | null {
  const normalized = languageTag.toLowerCase()

  if (normalized === 'zh-cn' || normalized.startsWith('zh-hans') || normalized === 'zh') {
    return 'zh-CN'
  }

  if (normalized === 'en' || normalized.startsWith('en-')) {
    return 'en'
  }

  return null
}

export function resolveSystemLanguage(languages = navigator.languages): SupportedLanguage {
  for (const language of languages) {
    const resolvedLanguage = resolveLanguageFromTag(language)
    if (resolvedLanguage) {
      return resolvedLanguage
    }
  }

  return defaultLanguage
}

export function resolveLanguagePreference(preference: LanguagePreference): SupportedLanguage {
  return preference === 'system' ? resolveSystemLanguage() : preference
}
