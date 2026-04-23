import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { SectionCard } from '../components/SectionCard'
import { getSessionSummaryDetail, type SessionSummaryDetail } from '../db/sessions'
import { useNow } from '../hooks/useNow'
import { formatDuration } from '../lib/rest-timer'
import type { SessionStatus } from '../models/types'

function getSessionStatusLabel(status: SessionStatus) {
  if (status === 'active') {
    return '进行中'
  }

  if (status === 'completed') {
    return '已完成'
  }

  return '未开始'
}

function getSessionDurationSeconds(
  startedAt: string | null,
  endedAt: string | null,
  now: number,
) {
  if (!startedAt) {
    return null
  }

  const startedAtMs = new Date(startedAt).getTime()
  const endedAtMs = endedAt ? new Date(endedAt).getTime() : now

  if (Number.isNaN(startedAtMs) || Number.isNaN(endedAtMs)) {
    return null
  }

  return Math.max(0, Math.floor((endedAtMs - startedAtMs) / 1000))
}

function getWeightLabel(weightKg: number | null) {
  return weightKg === null ? '未补录' : `${weightKg} kg`
}

function getRepsLabel(reps: number | null) {
  return reps === null ? '未补录' : `${reps} 次`
}

export function SummaryPage() {
  const { sessionId = 'unknown-session' } = useParams()
  const now = useNow()
  const [detail, setDetail] = useState<SessionSummaryDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadSummary() {
      try {
        setError(null)
        setIsLoading(true)
        setDetail(null)

        const result = await getSessionSummaryDetail(sessionId)
        if (isCancelled) {
          return
        }

        setDetail(result)
      } catch (loadError) {
        if (isCancelled) {
          return
        }

        console.error(loadError)
        setError('训练总结加载失败，请返回训练安排页后重试。')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadSummary()

    return () => {
      isCancelled = true
    }
  }, [sessionId])

  const completedExerciseCount =
    detail?.exercises.filter((exercise) => exercise.status === 'completed').length ?? 0
  const totalExerciseCount = detail?.exercises.length ?? 0
  const durationSeconds = detail
    ? getSessionDurationSeconds(detail.session.startedAt, detail.session.endedAt, now)
    : null

  return (
    <div className="space-y-4">
      <SectionCard
        title="本次训练总结"
        action={
          detail ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {getSessionStatusLabel(detail.session.status)}
            </span>
          ) : null
        }
      >
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {isLoading ? <p>正在读取训练总结...</p> : null}

        {!isLoading && !detail ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            <p>没有找到这个训练记录，可能 sessionId 不存在或数据已被删除。</p>
            <Link
              to="/"
              className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              返回训练安排
            </Link>
          </div>
        ) : null}

        {detail ? (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">训练名称</p>
                <p className="mt-1 font-medium text-slate-900">
                  {detail.session.templateName ?? '临时训练'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">总时长</p>
                <p className="mt-1 font-medium text-slate-900">
                  {durationSeconds === null ? '未开始' : formatDuration(durationSeconds)}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">完成动作</p>
                <p className="mt-1 font-medium text-slate-900">
                  {completedExerciseCount} / {totalExerciseCount}
                </p>
              </div>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              <p>Session ID：{detail.session.id}</p>
              {detail.session.startedAt && !detail.session.endedAt ? (
                <p>当前训练尚未结束，时长按当前时间兜底计算。</p>
              ) : null}
            </div>
          </>
        ) : null}
      </SectionCard>

      <SectionCard
        title="动作汇总"
        action={
          detail ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {totalExerciseCount} 个动作
            </span>
          ) : null
        }
      >
        {detail && detail.exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            这次训练还没有动作数据。
          </div>
        ) : null}

        {detail ? (
          <div className="space-y-3">
            {detail.exercises.map((exercise) => (
              <div key={exercise.id} className="rounded-3xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">{exercise.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {exercise.completedSets} / {exercise.targetSets} 组 ·{' '}
                      {getSessionStatusLabel(exercise.status)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                    {exercise.setRecords.length} 组记录
                  </span>
                </div>

                {exercise.setRecords.length === 0 ? (
                  <div className="mt-3 rounded-2xl border border-dashed border-slate-300 px-4 py-4 text-center text-sm text-slate-500">
                    这个动作还没有组记录。
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    {exercise.setRecords.map((setRecord) => (
                      <div
                        key={setRecord.id}
                        className="rounded-2xl bg-slate-50 p-3"
                      >
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-slate-500">组序号</p>
                            <p className="mt-1 font-medium text-slate-900">
                              第 {setRecord.setNumber} 组
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">用时</p>
                            <p className="mt-1 font-medium text-slate-900">
                              {formatDuration(setRecord.durationSeconds)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">重量</p>
                            <p className="mt-1 font-medium text-slate-900">
                              {getWeightLabel(setRecord.weightKg)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">次数</p>
                            <p className="mt-1 font-medium text-slate-900">
                              {getRepsLabel(setRecord.reps)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
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
