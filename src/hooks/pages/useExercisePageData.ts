import { useEffect, useState } from 'react'

import {
  completePlanItemSet,
  getScheduleExerciseDetail,
  skipPlanItemRest,
  undoLatestPlanItemSet,
  updateLatestSetRecordValues,
  type ScheduleExerciseDetail,
} from '../../db/sessions'
import {
  parseOptionalDistanceMeters,
  parseOptionalDurationSeconds,
  parseOptionalReps,
  parseOptionalWeightKg,
  toOptionalNumberString,
} from '../../lib/input-parsers'
import { triggerHaptic } from '../../lib/haptics'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import i18n from '../../i18n'
import {
  prepareRestTimerReminderPermissions,
  scheduleRestTimerNotification,
} from '../../native/training-notifications'
import { getMeasurementTypeForExercise } from '../../lib/set-record-measurement'

function syncLatestSetInputs(
  detail: ScheduleExerciseDetail | null,
  setWeightInput: (value: string) => void,
  setRepsInput: (value: string) => void,
  setDurationInput: (value: string) => void,
  setDistanceInput: (value: string) => void,
) {
  setWeightInput(toOptionalNumberString(detail?.latestSetRecord?.weightKg ?? null))
  setRepsInput(toOptionalNumberString(detail?.latestSetRecord?.reps ?? null))
  setDurationInput(toOptionalNumberString(detail?.latestSetRecord?.durationSeconds ?? null))
  setDistanceInput(toOptionalNumberString(detail?.latestSetRecord?.distanceMeters ?? null))
}

async function syncRestTimerNotification(detail: ScheduleExerciseDetail | null) {
  if (!detail) {
    return
  }

  try {
    await scheduleRestTimerNotification({
      exerciseId: detail.exercise.id,
      exerciseName: getDisplayExerciseName(i18n.t, detail.exercise),
      restEndsAt: detail.exercise.restEndsAt,
    })
  } catch (notificationError) {
    console.warn(notificationError)
  }
}

async function prepareRestTimerReminder() {
  try {
    await prepareRestTimerReminderPermissions()
  } catch (permissionError) {
    console.warn(permissionError)
  }
}

export function useExercisePageData(id: string) {
  const [detail, setDetail] = useState<ScheduleExerciseDetail | null>(null)
  const [weightInput, setWeightInput] = useState('')
  const [repsInput, setRepsInput] = useState('')
  const [durationInput, setDurationInput] = useState('')
  const [distanceInput, setDistanceInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadDetail() {
      try {
        setError(null)
        setIsLoading(true)

        const result = await getScheduleExerciseDetail(id)
        if (isCancelled) {
          return
        }

        setDetail(result)
        syncLatestSetInputs(result, setWeightInput, setRepsInput, setDurationInput, setDistanceInput)
      } catch (loadError) {
        if (isCancelled) {
          return
        }

        console.error(loadError)
        setError('动作数据加载失败，请返回训练安排页后重试。')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadDetail()

    return () => {
      isCancelled = true
    }
  }, [id])

  async function runMutation(action: () => Promise<void>) {
    try {
      setIsSubmitting(true)
      setError(null)
      await action()
      return true
    } catch (mutationError) {
      console.error(mutationError)
      setError(
        mutationError instanceof Error ? mutationError.message : '动作数据保存失败，请重试。',
      )
      void triggerHaptic('error')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCompleteSet() {
    if (!detail) {
      return false
    }

    let didComplete = false

    const didSucceed = await runMutation(async () => {
      await prepareRestTimerReminder()
      await completePlanItemSet(detail.exercise.id)
      const nextDetail = await getScheduleExerciseDetail(detail.exercise.id)

      setDetail(nextDetail)
      syncLatestSetInputs(nextDetail, setWeightInput, setRepsInput, setDurationInput, setDistanceInput)
      await syncRestTimerNotification(nextDetail)
      didComplete = true
    })

    if (!didSucceed) {
      return false
    }

    if (didComplete) {
      void triggerHaptic('success')
    }

    return didComplete
  }

  async function handleUpdateLatestSetRecord() {
    if (!detail?.latestSetRecord) {
      return false
    }

    const didSave = await runMutation(async () => {
      const latestSetRecord = await updateLatestSetRecordValues(detail.exercise.id, {
        distanceMeters: parseOptionalDistanceMeters(distanceInput),
        durationSeconds: parseOptionalDurationSeconds(durationInput),
        weightKg: parseOptionalWeightKg(weightInput),
        reps: parseOptionalReps(repsInput),
      })

      setDetail((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          latestSetRecord,
        }
      })
    })

    if (didSave) {
      void triggerHaptic('success')
    }

    return didSave
  }

  async function handleUndoLatestSet() {
    if (!detail?.latestSetRecord) {
      return false
    }

    let didUndo = false

    const didSucceed = await runMutation(async () => {
      await undoLatestPlanItemSet(detail.exercise.id)
      const nextDetail = await getScheduleExerciseDetail(detail.exercise.id)

      setDetail(nextDetail)
      syncLatestSetInputs(nextDetail, setWeightInput, setRepsInput, setDurationInput, setDistanceInput)
      await syncRestTimerNotification(nextDetail)
      didUndo = true
    })

    if (!didSucceed) {
      return false
    }

    if (didUndo) {
      void triggerHaptic('light')
    }

    return didUndo
  }

  async function handleSkipRest() {
    if (!detail) {
      return false
    }

    return runMutation(async () => {
      await skipPlanItemRest(detail.exercise.id)
      const nextDetail = await getScheduleExerciseDetail(detail.exercise.id)

      setDetail(nextDetail)
      await syncRestTimerNotification(nextDetail)
    })
  }

  const latestSetRecord = detail?.latestSetRecord ?? null
  const measurementType = getMeasurementTypeForExercise(detail?.exercise ?? {})
  const canCompleteSet =
    detail !== null && detail.exercise.completedSets < detail.exercise.targetSets && !isSubmitting
  const canUndoLatestSet = latestSetRecord !== null && !isSubmitting

  return {
    canCompleteSet,
    canUndoLatestSet,
    detail,
    distanceInput,
    durationInput,
    error,
    handleCompleteSet,
    handleSkipRest,
    handleUndoLatestSet,
    handleUpdateLatestSetRecord,
    isLoading,
    isSubmitting,
    latestSetRecord,
    measurementType,
    repsInput,
    setDistanceInput,
    setDurationInput,
    setRepsInput,
    setWeightInput,
    weightInput,
  }
}
