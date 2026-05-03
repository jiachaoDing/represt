import { LocalNotifications } from '@capacitor/local-notifications'
import type { PluginListenerHandle } from '@capacitor/core'

import { isNativePluginAvailable } from './capacitor-platform'
import { TrainingTimerNotification } from './training-timer-notification-plugin'

type AppRouter = {
  navigate: (to: string) => Promise<void> | void
}

let notificationActionListener: PluginListenerHandle | null = null
let trainingTimerNotificationListener: PluginListenerHandle | null = null

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
  if (isNativePluginAvailable('LocalNotifications') && !notificationActionListener) {
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

  if (isNativePluginAvailable('TrainingTimerNotification') && !trainingTimerNotificationListener) {
    trainingTimerNotificationListener = await TrainingTimerNotification.addListener(
      'trainingTimerNotificationTapped',
      (event) => {
        if (!event.path) {
          return
        }

        void router.navigate(event.path)
      },
    )

    const launch = await TrainingTimerNotification.consumeLaunchPath()
    if (launch.path) {
      void router.navigate(launch.path)
    }
  }
}
