import { LocalNotifications } from '@capacitor/local-notifications'
import type { PluginListenerHandle } from '@capacitor/core'

import { isNativePluginAvailable } from './capacitor-platform'

type AppRouter = {
  navigate: (to: string) => Promise<void> | void
}

let notificationActionListener: PluginListenerHandle | null = null

function getExercisePathFromNotification(extra: unknown) {
  if (!extra || typeof extra !== 'object') {
    return null
  }

  const exerciseId = 'exerciseId' in extra ? extra.exerciseId : null
  if (typeof exerciseId !== 'string' || exerciseId.length === 0) {
    return null
  }

  return `/exercise/${exerciseId}`
}

export async function initNotificationNavigation(router: AppRouter) {
  if (!isNativePluginAvailable('LocalNotifications') || notificationActionListener) {
    return
  }

  notificationActionListener = await LocalNotifications.addListener(
    'localNotificationActionPerformed',
    (event) => {
      const path = getExercisePathFromNotification(event.notification.extra)
      if (!path) {
        return
      }

      void router.navigate(path)
    },
  )
}
