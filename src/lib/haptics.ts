import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

import { isNativePluginAvailable } from '../native/capacitor-platform'

export type HapticType =
  | 'light'
  | 'medium'
  | 'heavy'
  | 'success'
  | 'warning'
  | 'error'
  | 'selection-start'
  | 'selection-end'

const webVibrationPatterns: Record<HapticType, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 35,
  success: [12, 35, 18],
  warning: [25, 40, 25],
  error: [35, 45, 35],
  'selection-start': 8,
  'selection-end': 12,
}

async function triggerNativeHaptic(type: HapticType) {
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

  if (type === 'selection-start') {
    await Haptics.selectionStart()
    await Haptics.impact({ style: ImpactStyle.Light })
    return
  }

  if (type === 'selection-end') {
    await Haptics.selectionEnd()
    await Haptics.impact({ style: ImpactStyle.Light })
    return
  }

  const style =
    type === 'heavy'
      ? ImpactStyle.Heavy
      : type === 'medium'
        ? ImpactStyle.Medium
        : ImpactStyle.Light

  await Haptics.impact({ style })
}

function triggerWebVibration(type: HapticType) {
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
    return
  }

  if (typeof navigator === 'undefined' || !navigator.vibrate) {
    return
  }

  navigator.vibrate(webVibrationPatterns[type])
}

export async function triggerHaptic(type: HapticType) {
  if (isNativePluginAvailable('Haptics')) {
    try {
      await triggerNativeHaptic(type)
      return
    } catch (hapticError) {
      console.warn(hapticError)
    }
  }

  triggerWebVibration(type)
}
