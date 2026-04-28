import { useState } from 'react'

const themePreferenceStorageKey = 'trainre.themePreference'

export const themePreferences = ['system', 'light', 'dark'] as const

export type ThemePreference = (typeof themePreferences)[number]

function isThemePreference(value: string | null): value is ThemePreference {
  return themePreferences.includes(value as ThemePreference)
}

function applyThemePreference(preference: ThemePreference) {
  if (preference === 'system') {
    document.documentElement.removeAttribute('data-theme')
    return
  }

  document.documentElement.dataset.theme = preference
}

export function getStoredThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return 'system'
  }

  const value = window.localStorage.getItem(themePreferenceStorageKey)
  return isThemePreference(value) ? value : 'system'
}

export function applyStoredThemePreference() {
  if (typeof document === 'undefined') {
    return
  }

  applyThemePreference(getStoredThemePreference())
}

export function useThemePreference() {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    getStoredThemePreference(),
  )

  function setPreference(nextPreference: ThemePreference) {
    window.localStorage.setItem(themePreferenceStorageKey, nextPreference)
    applyThemePreference(nextPreference)
    setPreferenceState(nextPreference)
  }

  return {
    preference,
    setPreference,
  }
}
