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
    <section className="mx-4 mt-4 overflow-hidden rounded-[1.25rem] bg-[var(--surface)] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] border border-[var(--outline-variant)]/20 p-5">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-[var(--on-surface-variant)]">训练日期</p>
          <p className="text-[13px] font-bold text-[var(--on-surface)]">{detail.session.sessionDateKey.slice(5)}</p>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-[var(--on-surface-variant)]">完成动作数</p>
          <p className="text-[13px] font-bold text-[var(--on-surface)]">{completedExerciseCount} 个动作</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-[var(--on-surface-variant)]">总组数</p>
          <p className="text-[13px] font-bold text-[var(--on-surface)]">
            {detail.exercises.reduce((acc, ex) => acc + ex.completedSets, 0)} 组
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-[var(--on-surface-variant)]">训练状态</p>
          <p className="text-[13px] font-bold text-[var(--primary)]">已完成</p>
        </div>
      </div>
    </section>
  )
}
