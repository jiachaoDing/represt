import { useEffect, useState, type Dispatch, type FormEvent, type SetStateAction } from 'react'
import { Link, useParams } from 'react-router-dom'

import { SectionCard } from '../components/SectionCard'
import {
  completeSessionExerciseSet,
  getSessionExerciseDetail,
  updateLatestSetRecordValues,
  type SessionExerciseDetail,
} from '../db/sessions'
import { useNow } from '../hooks/useNow'
import { formatDuration, getRestTimerSnapshot, getRestTimerState } from '../lib/rest-timer'
import type { SessionExercise, SessionExerciseStatus } from '../models/types'

function getExerciseStatusLabel(status: SessionExerciseStatus) {
  if (status === 'active') {
    return '进行中'
  }

  if (status === 'completed') {
    return '已完成'
  }

  return '未开始'
}

function getCurrentSetDurationLabel(startedAt: string | null, now: number) {
  if (!startedAt) {
    return '00:00'
  }

  const startedAtMs = new Date(startedAt).getTime()
  if (Number.isNaN(startedAtMs)) {
    return '00:00'
  }

  const elapsedSeconds = Math.max(0, Math.floor((now - startedAtMs) / 1000))
  return formatDuration(elapsedSeconds)
}

function getRestTimerLabel(exercise: SessionExercise, now: number) {
  if (exercise.status === 'completed') {
    return 'completed'
  }

  return getRestTimerSnapshot(getRestTimerState(exercise), now).label
}

function toOptionalNumberString(value: number | null) {
  return value === null ? '' : String(value)
}

function parseOptionalWeightKg(value: string) {
  const parsed = Number.parseFloat(value.trim())
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

function parseOptionalReps(value: string) {
  const parsed = Number.parseInt(value.trim(), 10)
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null
}

function syncLatestSetInputs(
  setWeightInput: Dispatch<SetStateAction<string>>,
  setRepsInput: Dispatch<SetStateAction<string>>,
  detail: SessionExerciseDetail | null,
) {
  setWeightInput(toOptionalNumberString(detail?.latestSetRecord?.weightKg ?? null))
  setRepsInput(toOptionalNumberString(detail?.latestSetRecord?.reps ?? null))
}

export function ExercisePage() {
  const { id = 'unknown' } = useParams()
  const now = useNow()
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
        syncLatestSetInputs(setWeightInput, setRepsInput, result)
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
    } catch (mutationError) {
      console.error(mutationError)
      setError(
        mutationError instanceof Error ? mutationError.message : '动作数据保存失败，请重试。',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleCompleteSet() {
    if (!detail || !setTimingStartedAt) {
      return
    }

    await runMutation(async () => {
      const setRecord = await completeSessionExerciseSet(detail.exercise.id, setTimingStartedAt)
      const nextDetail = await getSessionExerciseDetail(detail.exercise.id)

      setDetail(nextDetail)
      syncLatestSetInputs(setWeightInput, setRepsInput, nextDetail)
      setSetTimingStartedAt(
        nextDetail && nextDetail.exercise.status !== 'completed' ? setRecord.completedAt : null,
      )
    })
  }

  async function handleUpdateLatestSetRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!detail?.latestSetRecord) {
      return
    }

    await runMutation(async () => {
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

  return (
    <div className="space-y-4">
      <SectionCard
        title="动作执行"
        action={
          detail ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {getExerciseStatusLabel(detail.exercise.status)}
            </span>
          ) : null
        }
      >
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {isLoading ? <p>正在读取动作数据...</p> : null}

        {!isLoading && !detail ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            这个动作不存在，可能已经被删除。
          </div>
        ) : null}

        {detail ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">动作名称</p>
                <p className="mt-1 font-medium text-slate-900">{detail.exercise.name}</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">当前进度</p>
                <p className="mt-1 font-medium text-slate-900">
                  {detail.exercise.completedSets} / {detail.exercise.targetSets} 组
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">当前组计时</p>
                <p className="mt-1 font-medium text-slate-900">
                  {getCurrentSetDurationLabel(setTimingStartedAt, now)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">当前动作倒计时</p>
                <p className="mt-1 font-medium text-slate-900">
                  {getRestTimerLabel(detail.exercise, now)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">动作状态</p>
                <p className="mt-1 font-medium text-slate-900">
                  {getExerciseStatusLabel(detail.exercise.status)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">所属训练</p>
                <p className="mt-1 font-medium text-slate-900">{detail.session.templateName ?? '临时训练'}</p>
              </div>
            </div>

            <button
              type="button"
              disabled={!canCompleteSet}
              onClick={() => void handleCompleteSet()}
              className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {detail.exercise.status === 'completed' ? '动作已完成' : '完成本组'}
            </button>

            <p className="text-xs text-slate-500">
              进入页面后只在本地开始当前组计时；离开前若没点击“完成本组”，这次计时不会落库。
            </p>
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="最近一组记录">
        {!latestSetRecord ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            还没有组记录，先完成一组后这里会显示最近一组。
          </div>
        ) : null}

        {latestSetRecord ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">组序号</p>
                <p className="mt-1 font-medium text-slate-900">第 {latestSetRecord.setNumber} 组</p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">本组用时</p>
                <p className="mt-1 font-medium text-slate-900">
                  {formatDuration(latestSetRecord.durationSeconds)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">重量</p>
                <p className="mt-1 font-medium text-slate-900">
                  {latestSetRecord.weightKg === null ? '未补录' : `${latestSetRecord.weightKg} kg`}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">次数</p>
                <p className="mt-1 font-medium text-slate-900">
                  {latestSetRecord.reps === null ? '未补录' : `${latestSetRecord.reps} 次`}
                </p>
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleUpdateLatestSetRecord}>
              <div className="grid grid-cols-2 gap-3">
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    重量 (kg)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    inputMode="decimal"
                    value={weightInput}
                    disabled={isSubmitting}
                    onChange={(event) => setWeightInput(event.target.value)}
                    placeholder="例如 60"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    次数
                  </span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={repsInput}
                    disabled={isSubmitting}
                    onChange={(event) => setRepsInput(event.target.value)}
                    placeholder="例如 8"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
              >
                保存最近一组补录
              </button>
            </form>
          </>
        ) : null}

        <Link
          to="/"
          className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          返回训练安排
        </Link>
      </SectionCard>
    </div>
  )
}
