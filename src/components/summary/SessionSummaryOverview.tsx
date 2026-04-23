import { Link } from 'react-router-dom'
import type { SessionSummaryDetail } from '../../db/sessions'

type SessionSummaryOverviewProps = {
  detail: SessionSummaryDetail | null
  isLoading: boolean
}

export function SessionSummaryOverview({ detail, isLoading }: SessionSummaryOverviewProps) {
  const completedExerciseCount =
    detail?.exercises.filter((exercise) => exercise.status === 'completed').length ?? 0
  const totalExerciseCount = detail?.exercises.length ?? 0
  
  // Calculate total volume (weight * reps)
  const totalVolume = detail?.exercises.reduce((acc, exercise) => {
    return acc + exercise.setRecords.reduce((setAcc, set) => {
      const weight = set.weightKg ?? 0
      const reps = set.reps ?? 0
      return setAcc + (weight * reps)
    }, 0)
  }, 0) ?? 0

  if (isLoading) {
    return (
      <div className="mx-4 mt-6 h-[8rem] rounded-3xl bg-[var(--surface-container)] opacity-50 animate-pulse" />
    )
  }

  if (!detail) {
    return (
      <div className="mx-4 mt-6 space-y-4 text-center">
        <p className="text-[var(--on-surface-variant)]">没有找到这次训练。</p>
        <Link to="/" className="inline-block rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--on-primary)]">
          返回训练安排
        </Link>
      </div>
    )
  }

  return (
    <section className="mx-4 mt-4 overflow-hidden rounded-3xl bg-[var(--surface-container)] p-6">
      <p className="text-sm font-medium text-[var(--on-surface-variant)]">{detail.session.sessionDateKey}</p>
      
      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wider">完成动作</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl font-medium tracking-tighter text-[var(--on-surface)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {completedExerciseCount}
            </span>
            <span className="text-xl text-[var(--on-surface-variant)]">
              / {totalExerciseCount}
            </span>
          </div>
        </div>
        
        <div>
          <p className="text-xs text-[var(--on-surface-variant)] uppercase tracking-wider">总容量</p>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-4xl font-medium tracking-tighter text-[var(--on-surface)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {totalVolume.toLocaleString()}
            </span>
            <span className="text-xl text-[var(--on-surface-variant)]">
              kg
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
