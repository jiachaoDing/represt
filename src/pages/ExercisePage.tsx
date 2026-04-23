import { Link, useParams } from 'react-router-dom'

import { SectionCard } from '../components/SectionCard'
import { useNow } from '../hooks/useNow'
import { getRestTimerSnapshot } from '../lib/rest-timer'
import type { RestTimerState } from '../models/types'

const previewTimer: RestTimerState = {
  sessionExerciseId: 'demo-bench-press',
  status: 'running',
  startedAt: new Date(Date.now() - 10_000).toISOString(),
  endsAt: new Date(Date.now() + 50_000).toISOString(),
}

export function ExercisePage() {
  const { id = 'unknown' } = useParams()
  const now = useNow()
  const timer = getRestTimerSnapshot(previewTimer, now)

  return (
    <div className="space-y-4">
      <SectionCard title="动作执行">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <p className="text-xs text-slate-500">动作标识</p>
            <p className="mt-1 break-all font-medium text-slate-900">{id}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <p className="text-xs text-slate-500">当前进度</p>
            <p className="mt-1 font-medium text-slate-900">0 / 5 组</p>
          </div>
        </div>
        <div className="rounded-2xl bg-slate-950 p-4 text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-300">间歇提醒占位</p>
          <p className="mt-2 text-2xl font-semibold">{timer.label}</p>
          <p className="mt-2 text-sm text-slate-300">
            后续将在这里实现进入页面后开始当前待完成组计时，以及点击一次完成当前组。
          </p>
        </div>
        <button
          type="button"
          disabled
          className="w-full rounded-2xl bg-slate-300 px-4 py-4 text-base font-semibold text-slate-600"
        >
          完成本组（MVP 逻辑待接入）
        </button>
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
        <p>后续将在这里实现最近一组的重量、次数补录，以及首组开始计时与退出作废规则。</p>
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
