import { useEffect, useState } from 'react'

import {
  completeSessionExerciseSet,
  getSessionExerciseDetail,
  skipSessionExerciseRest,
  undoLatestSessionExerciseSet,
  updateLatestSetRecordValues,
  type SessionExerciseDetail,
} from '../../db/sessions'
import {
  parseOptionalReps,
  parseOptionalWeightKg,
  toOptionalNumberString,
} from '../../lib/input-parsers'
import { triggerHaptic } from '../../lib/haptics'
import { scheduleRestTimerNotification } from '../../native/training-notifications'

function syncLatestSetInputs(
  detail: SessionExerciseDetail | null,
  setWeightInput: (value: string) => void,
  setRepsInput: (value: string) => void,
) {
  setWeightInput(toOptionalNumberString(detail?.latestSetRecord?.weightKg ?? null))
  setRepsInput(toOptionalNumberString(detail?.latestSetRecord?.reps ?? null))
}

async function syncRestTimerNotification(detail: SessionExerciseDetail | null) {
  if (!detail) {
    return
  }

  try {
    await scheduleRestTimerNotification({
      exerciseId: detail.exercise.id,
      exerciseName: detail.exercise.name,
      restEndsAt: detail.exercise.restEndsAt,
    })
  } catch (notificationError) {
    console.warn(notificationError)
  }
}

export function useExercisePageData(id: string) {
  const [detail, setDetail] = useState<SessionExerciseDetail | null>(null)
  const [weightInput, setWeightInput] = useState('')
  const [repsInput, setRepsInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadDetail() {
      try {
        setError(null)
        setIsLoading(true)

        const result = await getSessionExerciseDetail(id)
        if (isCancelled) {
          return
        }

        setDetail(result)
        syncLatestSetInputs(result, setWeightInput, setRepsInput)
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
      await completeSessionExerciseSet(detail.exercise.id)
      const nextDetail = await getSessionExerciseDetail(detail.exercise.id)

      setDetail(nextDetail)
      syncLatestSetInputs(nextDetail, setWeightInput, setRepsInput)
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
      await undoLatestSessionExerciseSet(detail.exercise.id)
      const nextDetail = await getSessionExerciseDetail(detail.exercise.id)

      setDetail(nextDetail)
      syncLatestSetInputs(nextDetail, setWeightInput, setRepsInput)
      await syncRestTimerNotification(nextDetail)
      didUndo = true
    })

    if (!didSucceed) {
      return false
    }

    return didUndo
  }

  async function handleSkipRest() {
    if (!detail) {
      return false
    }

    return runMutation(async () => {
      await skipSessionExerciseRest(detail.exercise.id)
      const nextDetail = await getSessionExerciseDetail(detail.exercise.id)

      setDetail(nextDetail)
      await syncRestTimerNotification(nextDetail)
    })
  }

  const latestSetRecord = detail?.latestSetRecord ?? null
  const canCompleteSet =
    detail !== null && detail.exercise.completedSets < detail.exercise.targetSets && !isSubmitting
  const canUndoLatestSet = latestSetRecord !== null && !isSubmitting

  return {
    canCompleteSet,
    canUndoLatestSet,
    detail,
    error,
    handleCompleteSet,
    handleSkipRest,
    handleUndoLatestSet,
    handleUpdateLatestSetRecord,
    isLoading,
    isSubmitting,
    latestSetRecord,
    repsInput,
    setRepsInput,
    setWeightInput,
    weightInput,
  }
}
