import { Link } from 'react-router-dom'
import type { SessionSummaryDetail } from '../../db/sessions'
import {
  getCompletedAtLabel,
  getRepsLabel,
  getWeightLabel,
} from '../../lib/session-display'

type SessionExerciseSummaryListProps = {
  detail: SessionSummaryDetail | null
}

export function SessionExerciseSummaryList({ detail }: SessionExerciseSummaryListProps) {
  if (!detail) {
    return null
  }

  if (detail.exercises.length === 0) {
    return (
      <div className="mx-4 mt-8">
        <p className="text-[var(--on-surface-variant)]">这份训练还没有动作数据。</p>
      </div>
    )
  }

  return (
    <section className="mt-6">
      <div className="flex flex-col gap-4 px-4">
        {detail.exercises.map((exercise) => (
          <div key={exercise.id} className="rounded-[1.25rem] bg-[var(--surface)] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-[var(--outline-variant)]/20">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-[16px] font-bold text-[var(--on-surface)]">{exercise.name}</h4>
              <span className="text-[13px] font-medium text-[var(--primary)]">
                {exercise.completedSets} 组完成
              </span>
            </div>

            {exercise.setRecords.length > 0 ? (
              <div className="flex flex-col gap-2.5">
                {exercise.setRecords.map((setRecord) => (
                  <div key={setRecord.id} className="flex items-center text-[14px]">
                    <div className="w-12 text-[var(--on-surface-variant)]">{setRecord.setNumber}组</div>
                    <div className="flex-1 text-[var(--on-surface)] pl-4">
                      {setRecord.weightKg ?? 0}kg × {setRecord.reps ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[13px] text-[var(--outline)]">没有记录数据</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 px-4 pb-12 flex justify-center">
        <Link 
          to="/" 
          className="inline-flex h-12 w-full max-w-[200px] items-center justify-center rounded-xl bg-[var(--surface-container)] text-[15px] font-medium text-[var(--on-surface)] transition-colors tap-highlight-transparent active:scale-[0.98]"
        >
          返回今日安排
        </Link>
      </div>
    </section>
  )
}
