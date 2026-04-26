import { isNativePluginAvailable } from '../native/capacitor-platform'

export type HapticType =
  | 'light'
  | 'medium'
  | 'success'
  | 'warning'
  | 'error'

const webVibrationPatterns: Record<HapticType, number | number[]> = {
  light: 8,
  medium: 16,
  success: [10, 30, 14],
  warning: [18, 40, 18],
  error: [28, 45, 28],
}

const hapticsEnabledStorageKey = 'trainre:haptics-enabled'
const defaultHapticsEnabled = true
const feedbackCooldownMs = 150
const alertCooldownMs = 500
const subscribers = new Set<() => void>()
let lastFeedbackAt = 0
let lastAlertAt = 0
let cachedHapticsEnabled: boolean | null = null

function readHapticsEnabled() {
  if (typeof window === 'undefined') {
    return defaultHapticsEnabled
  }

  try {
    const storedValue = window.localStorage.getItem(hapticsEnabledStorageKey)
    return storedValue === null ? defaultHapticsEnabled : storedValue === 'true'
  } catch {
    return defaultHapticsEnabled
  }
}

function notifySubscribers() {
  subscribers.forEach((listener) => listener())
}

export function isHapticFeedbackEnabled() {
  if (cachedHapticsEnabled === null) {
    cachedHapticsEnabled = readHapticsEnabled()
  }

  return cachedHapticsEnabled
}

export function setHapticFeedbackEnabled(enabled: boolean) {
  cachedHapticsEnabled = enabled

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(hapticsEnabledStorageKey, String(enabled))
    } catch {
      // The in-memory value still applies for the current session.
    }
  }

  notifySubscribers()
}

export function subscribeHapticsPreference(listener: () => void) {
  subscribers.add(listener)
  return () => subscribers.delete(listener)
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key !== hapticsEnabledStorageKey) {
      return
    }

    cachedHapticsEnabled = null
    notifySubscribers()
  })
}

function isCoolingDown(type: HapticType) {
  const now = Date.now()

  if (type === 'warning' || type === 'error') {
    if (now - lastAlertAt < alertCooldownMs) {
      return true
    }

    lastAlertAt = now
    return false
  }

  if (now - lastFeedbackAt < feedbackCooldownMs) {
    return true
  }

  lastFeedbackAt = now
  return false
}

async function triggerNativeHaptic(type: HapticType) {
  const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')

  if (type === 'success') {
    await Haptics.notification({ type: NotificationType.Success })
    return
  }

  if (type === 'warning') {
    await Haptics.notification({ type: NotificationType.Warning })
    return
  }

  if (type === 'error') {
    await Haptics.notification({ type: NotificationType.Error })
    return
  }

  const style = type === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light

  await Haptics.impact({ style })
}

function triggerWebVibration(type: HapticType) {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return
  }

  if (typeof navigator === 'undefined' || !navigator.vibrate) {
    return
  }

  try {
    navigator.vibrate(webVibrationPatterns[type])
  } catch {
    // Browser or system vibration policies may reject feedback.
  }
}

export async function triggerHaptic(type: HapticType) {
  if (!isHapticFeedbackEnabled() || isCoolingDown(type)) {
    return
  }

  if (isNativePluginAvailable('Haptics')) {
    try {
      await triggerNativeHaptic(type)
      return
    } catch {
      // Fall back to Web Vibration when the native plugin is unavailable at runtime.
    }
  }

  triggerWebVibration(type)
}
