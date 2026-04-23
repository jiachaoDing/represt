import { useEffect, useState } from 'react'

import {
  completeSessionExerciseSet,
  getSessionExerciseDetail,
  updateLatestSetRecordValues,
  type SessionExerciseDetail,
} from '../../db/sessions'
import {
  parseOptionalReps,
  parseOptionalWeightKg,
  toOptionalNumberString,
} from '../../lib/input-parsers'

function syncLatestSetInputs(
  detail: SessionExerciseDetail | null,
  setWeightInput: (value: string) => void,
  setRepsInput: (value: string) => void,
) {
  setWeightInput(toOptionalNumberString(detail?.latestSetRecord?.weightKg ?? null))
  setRepsInput(toOptionalNumberString(detail?.latestSetRecord?.reps ?? null))
}

export function useExercisePageData(id: string) {
  const [detail, setDetail] = useState<SessionExerciseDetail | null>(null)
  const [setTimingStartedAt, setSetTimingStartedAt] = useState<string | null>(null)
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
        setSetTimingStartedAt(
          result && result.exercise.status !== 'completed' ? new Date().toISOString() : null,
        )
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
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCompleteSet() {
    if (!detail || !setTimingStartedAt) {
      return false
    }

    let didComplete = false

    const didSucceed = await runMutation(async () => {
      const setRecord = await completeSessionExerciseSet(detail.exercise.id, setTimingStartedAt)
      const nextDetail = await getSessionExerciseDetail(detail.exercise.id)

      setDetail(nextDetail)
      syncLatestSetInputs(nextDetail, setWeightInput, setRepsInput)
      setSetTimingStartedAt(
        nextDetail && nextDetail.exercise.status !== 'completed' ? setRecord.completedAt : null,
      )
      didComplete = true
    })

    if (!didSucceed) {
      return false
    }

    return didComplete
  }

  async function handleUpdateLatestSetRecord() {
    if (!detail?.latestSetRecord) {
      return false
    }

    return runMutation(async () => {
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
  }

  const latestSetRecord = detail?.latestSetRecord ?? null
  const canCompleteSet =
    detail !== null &&
    detail.exercise.status !== 'completed' &&
    setTimingStartedAt !== null &&
    !isSubmitting

  return {
    canCompleteSet,
    detail,
    error,
    handleCompleteSet,
    handleUpdateLatestSetRecord,
    isLoading,
    isSubmitting,
    latestSetRecord,
    repsInput,
    setRepsInput,
    setWeightInput,
    timingStartedAt: setTimingStartedAt,
    weightInput,
  }
}
