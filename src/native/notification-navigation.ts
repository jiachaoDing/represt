import type { PluginListenerHandle } from '@capacitor/core'

import { completePlanItemSet, skipPlanItemRest } from '../db/session-records'
import { getScheduleExerciseDetail } from '../db/session-schedule'
import { getDisplayExerciseName } from '../lib/exercise-name'
import { repeatQuickTimer, toggleQuickTimer } from '../hooks/useQuickTimer'
import i18n from '../i18n'
import { isNativePluginAvailable } from './capacitor-platform'
import { scheduleRestTimerNotification } from './training-notifications'
import { TrainingTimerNotification } from './training-timer-notification-plugin'
import type { TrainingTimerNotificationLaunch } from './training-timer-notification-plugin'

type AppRouter = {
  navigate: (to: string) => Promise<void> | void
}

let trainingTimerNotificationListener: PluginListenerHandle | null = null
export const TRAINING_NOTIFICATION_EXERCISE_UPDATED_EVENT =
  'trainre:training-notification-exercise-updated'

async function completeSetFromNotification(exerciseId: string) {
  await completePlanItemSet(exerciseId)
  const detail = await getScheduleExerciseDetail(exerciseId)
  if (!detail) {
    return
  }

  await scheduleRestTimerNotification({
    exerciseId: detail.exercise.id,
    exerciseName: getDisplayExerciseName(i18n.t, detail.exercise),
    restEndsAt: detail.exercise.restEndsAt,
  })

  window.dispatchEvent(
    new CustomEvent(TRAINING_NOTIFICATION_EXERCISE_UPDATED_EVENT, {
      detail: { exerciseId },
    }),
  )
}

async function skipRestFromNotification(exerciseId: string) {
  await skipPlanItemRest(exerciseId)
  const detail = await getScheduleExerciseDetail(exerciseId)

  await scheduleRestTimerNotification({
    exerciseId,
    exerciseName: detail ? getDisplayExerciseName(i18n.t, detail.exercise) : '',
    restEndsAt: detail?.exercise.restEndsAt ?? null,
  })

  window.dispatchEvent(
    new CustomEvent(TRAINING_NOTIFICATION_EXERCISE_UPDATED_EVENT, {
      detail: { exerciseId },
    }),
  )
}

function handleNotificationLaunch(router: AppRouter, event: TrainingTimerNotificationLaunch) {
  if (event.path) {
    void router.navigate(event.path)
  }

  if (event.launchAction === 'skipRest' && event.exerciseId) {
    void skipRestFromNotification(event.exerciseId).catch((actionError) => {
      console.warn(actionError)
    })
    return
  }

  if (event.launchAction !== 'completeSet' || !event.exerciseId) {
    if (event.launchAction === 'quickTimerToggle') {
      toggleQuickTimer()
    } else if (event.launchAction === 'quickTimerRepeat') {
      repeatQuickTimer()
    }
    return
  }

  void completeSetFromNotification(event.exerciseId).catch((actionError) => {
    console.warn(actionError)
  })
}

export async function initNotificationNavigation(router: AppRouter) {
  if (isNativePluginAvailable('TrainingTimerNotification') && !trainingTimerNotificationListener) {
    trainingTimerNotificationListener = await TrainingTimerNotification.addListener(
      'trainingTimerNotificationTapped',
      (event) => {
        handleNotificationLaunch(router, event)
      },
    )

    const launch = await TrainingTimerNotification.consumeLaunchPath()
    handleNotificationLaunch(router, launch)
  }
}
