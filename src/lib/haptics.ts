import {
  getCapacitorPlatform,
  isNativeApp,
  isNativePluginAvailable,
} from '../native/capacitor-platform'

export type HapticType =
  | 'light'
  | 'medium'
  | 'success'
  | 'warning'
  | 'error'

const webVibrationPatterns: Record<HapticType, number | number[]> = {
  light: 18,
  medium: 32,
  success: [24, 32, 24],
  warning: [34, 42, 34],
  error: [44, 48, 44],
}

const androidVibrationDurations: Record<HapticType, number> = {
  light: 18,
  medium: 36,
  success: 42,
  warning: 52,
  error: 64,
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
    if (getCapacitorPlatform() === 'android') {
      await Haptics.vibrate({ duration: androidVibrationDurations[type] })
    }
    return
  }

  if (type === 'warning') {
    await Haptics.notification({ type: NotificationType.Warning })
    if (getCapacitorPlatform() === 'android') {
      await Haptics.vibrate({ duration: androidVibrationDurations[type] })
    }
    return
  }

  if (type === 'error') {
    await Haptics.notification({ type: NotificationType.Error })
    if (getCapacitorPlatform() === 'android') {
      await Haptics.vibrate({ duration: androidVibrationDurations[type] })
    }
    return
  }

  const style = type === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light

  await Haptics.impact({ style })
  if (getCapacitorPlatform() === 'android') {
    await Haptics.vibrate({ duration: androidVibrationDurations[type] })
  }
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

  if (isNativeApp() || isNativePluginAvailable('Haptics')) {
    try {
      await triggerNativeHaptic(type)
      return
    } catch {
      // Fall back to Web Vibration when the native plugin is unavailable at runtime.
    }
  }

  triggerWebVibration(type)
}
