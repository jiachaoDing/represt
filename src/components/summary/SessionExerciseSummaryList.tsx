import { Link } from 'react-router-dom'

import { SectionCard } from '../ui/SectionCard'
import type { SessionSummaryDetail } from '../../db/sessions'
import { formatDuration } from '../../lib/rest-timer'
import { getExerciseStatusLabel, getRepsLabel, getWeightLabel } from '../../lib/session-display'

type SessionExerciseSummaryListProps = {
  detail: SessionSummaryDetail | null
}

export function SessionExerciseSummaryList({ detail }: SessionExerciseSummaryListProps) {
  const totalExerciseCount = detail?.exercises.length ?? 0

  return (
    <SectionCard
      title="动作汇总"
      action={
        detail ? (
          <span className="rounded border border-slate-300 px-2 py-1 text-xs">
            {totalExerciseCount} 个动作
          </span>
        ) : null
      }
    >
      {detail && detail.exercises.length === 0 ? <p>这份训练还没有动作数据。</p> : null}

      {detail ? (
        <div className="space-y-3">
          {detail.exercises.map((exercise) => (
            <div key={exercise.id} className="space-y-2 rounded border border-slate-200 p-3">
              <div className="space-y-1">
                <p className="font-medium">{exercise.name}</p>
                <p className="text-xs text-slate-500">
                  {exercise.completedSets} / {exercise.targetSets} 组 · {getExerciseStatusLabel(exercise.status)}
                </p>
              </div>

              {exercise.setRecords.length === 0 ? <p className="text-sm text-slate-500">还没有组记录。</p> : null}

              {exercise.setRecords.map((setRecord) => (
                <div key={setRecord.id} className="grid grid-cols-2 gap-3 rounded border border-slate-200 p-3 sm:grid-cols-4">
                  <div>
                    <p className="text-xs text-slate-500">组序号</p>
                    <p className="mt-1 font-medium">第 {setRecord.setNumber} 组</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">用时</p>
                    <p className="mt-1 font-medium">{formatDuration(setRecord.durationSeconds)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">重量</p>
                    <p className="mt-1 font-medium">{getWeightLabel(setRecord.weightKg)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">次数</p>
                    <p className="mt-1 font-medium">{getRepsLabel(setRecord.reps)}</p>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <Link to="/" className="inline-flex rounded border border-slate-300 px-3 py-2 text-sm">
        返回训练安排
      </Link>
    </SectionCard>
  )
}
