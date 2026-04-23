import { Link } from 'react-router-dom'
import type { FormEvent } from 'react'

import { SectionCard } from '../ui/SectionCard'
import type { SessionExerciseDetail } from '../../db/sessions'
import { formatDuration } from '../../lib/rest-timer'
import { getRepsLabel, getWeightLabel } from '../../lib/session-display'

type LatestSetRecordPanelProps = {
  detail: SessionExerciseDetail | null
  isSubmitting: boolean
  latestSetRecord: SessionExerciseDetail['latestSetRecord']
  repsInput: string
  setRepsInput: (value: string) => void
  setWeightInput: (value: string) => void
  weightInput: string
  onSubmit: () => Promise<void>
}

export function LatestSetRecordPanel({
  detail,
  isSubmitting,
  latestSetRecord,
  repsInput,
  setRepsInput,
  setWeightInput,
  weightInput,
  onSubmit,
}: LatestSetRecordPanelProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit()
  }

  return (
    <SectionCard title="最近一组">
      {!latestSetRecord ? <p>还没有组记录。</p> : null}

      {latestSetRecord ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500">组序号</p>
              <p className="mt-1 font-medium">第 {latestSetRecord.setNumber} 组</p>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500">本组用时</p>
              <p className="mt-1 font-medium">{formatDuration(latestSetRecord.durationSeconds)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500">重量</p>
              <p className="mt-1 font-medium">{getWeightLabel(latestSetRecord.weightKg)}</p>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500">次数</p>
              <p className="mt-1 font-medium">{getRepsLabel(latestSetRecord.reps)}</p>
            </div>
          </div>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs text-slate-500">重量 (kg)</span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  inputMode="decimal"
                  value={weightInput}
                  disabled={isSubmitting}
                  onChange={(event) => setWeightInput(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs text-slate-500">次数</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={repsInput}
                  disabled={isSubmitting}
                  onChange={(event) => setRepsInput(event.target.value)}
                  className="w-full rounded border border-slate-300 px-3 py-2"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded border border-slate-300 px-3 py-2 text-sm disabled:text-slate-300"
            >
              保存补录
            </button>
          </form>
        </div>
      ) : null}

      <Link to={detail ? `/summary/${detail.session.id}` : '/'} className="inline-flex rounded border border-slate-300 px-3 py-2 text-sm">
        {detail ? '查看总结' : '返回训练安排'}
      </Link>
    </SectionCard>
  )
}
