import { useCallback, useSyncExternalStore } from 'react'

import {
  isHapticFeedbackEnabled,
  setHapticFeedbackEnabled,
  subscribeHapticsPreference,
} from '../lib/haptics'

export function useHapticsPreference() {
  const isEnabled = useSyncExternalStore(
    subscribeHapticsPreference,
    isHapticFeedbackEnabled,
    () => true,
  )
  const setIsEnabled = useCallback((enabled: boolean) => {
    setHapticFeedbackEnabled(enabled)
  }, [])

  return {
    isEnabled,
    setIsEnabled,
  }
}
