import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { SectionCard } from '../components/SectionCard'
import { getSessionExerciseDetail, type SessionExerciseDetail } from '../db/sessions'
import { useNow } from '../hooks/useNow'
import { getRestTimerSnapshot } from '../lib/rest-timer'
import type { RestTimerState, SessionExerciseStatus } from '../models/types'

const previewTimer: RestTimerState = {
  sessionExerciseId: 'demo-session-exercise',
  status: 'running',
  startedAt: new Date(Date.now() - 10_000).toISOString(),
  endsAt: new Date(Date.now() + 50_000).toISOString(),
}

function getExerciseStatusLabel(status: SessionExerciseStatus) {
  if (status === 'active') {
    return '进行中'
  }

  if (status === 'completed') {
    return '已完成'
  }

  return '未开始'
}

export function ExercisePage() {
  const { id = 'unknown' } = useParams()
  const now = useNow()
  const timer = getRestTimerSnapshot(previewTimer, now)
  const [detail, setDetail] = useState<SessionExerciseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDetail() {
      try {
        setError(null)
        setIsLoading(true)
        const result = await getSessionExerciseDetail(id)
        setDetail(result)
      } catch (loadError) {
        console.error(loadError)
        setError('动作数据加载失败，请返回训练安排页后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    void loadDetail()
  }, [id])

  return (
    <div className="space-y-4">
      <SectionCard title="动作执行">
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

            <div className="rounded-2xl bg-slate-950 p-4 text-white">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">间歇提醒占位</p>
              <p className="mt-2 text-2xl font-semibold">{timer.label}</p>
              <p className="mt-2 text-sm text-slate-300">
                当前页已接入真实动作数据，完成本组、补录重量和次数仍保留到下一步实现。
              </p>
            </div>
          </>
        ) : null}
      </SectionCard>

      <SectionCard title="最近一组补录占位">
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              重量 (kg)
            </span>
            <input
              type="number"
              disabled
              placeholder="例如 60"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-400"
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
              次数
            </span>
            <input
              type="number"
              disabled
              placeholder="例如 8"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-400"
            />
          </label>
        </div>
        <p>这一页暂未接入“完成本组”和组记录逻辑，本任务只补最小 session 闭环。</p>
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
