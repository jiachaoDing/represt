import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { SessionSummaryDetail } from '../../db/sessions'
import { getSessionStatusLabel } from '../../lib/session-display'

type SessionSummaryOverviewProps = {
  detail: SessionSummaryDetail | null
  emptyState?: ReactNode
  isLoading: boolean
}

export function SessionSummaryOverview({
  detail,
  emptyState,
  isLoading,
}: SessionSummaryOverviewProps) {
  const completedSetCount =
    detail?.exercises.reduce((acc, exercise) => acc + exercise.completedSets, 0) ?? 0
  const completedExerciseNames =
    detail?.exercises.filter((exercise) => exercise.completedSets > 0).map((exercise) => exercise.name) ?? []
  const exerciseNamePreview = completedExerciseNames.slice(0, 3).join('、')
  const exerciseNameSuffix = completedExerciseNames.length > 3 ? `等 ${completedExerciseNames.length} 个动作` : ''
  const summaryText =
    completedExerciseNames.length > 0
      ? `${exerciseNamePreview}${exerciseNameSuffix}已记录。`
      : '完成一组后，这里会生成训练总结。'

  if (isLoading) {
    return (
      <div className="mx-4 mt-6 h-[8rem] rounded-3xl bg-[var(--surface-container)] opacity-50 animate-pulse" />
    )
  }

  if (!detail) {
    if (emptyState) {
      return <>{emptyState}</>
    }

    return (
      <div className="mx-4 mt-6 space-y-4 text-center">
        <p className="text-[var(--on-surface-variant)]">没有找到这次训练。</p>
        <Link
          to="/"
          viewTransition
          className="inline-block rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--on-primary)]"
        >
          返回训练安排
        </Link>
      </div>
    )
  }

  return (
    <section className="mx-4 mt-4 overflow-hidden rounded-[1.5rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[var(--on-surface-variant)]">
            {detail.session.sessionDateKey.slice(5)} 训练
          </p>
          <p className="mt-2 text-[3.25rem] font-bold leading-none tracking-normal text-[var(--on-surface)]">
            {completedSetCount}
          </p>
          <p className="mt-2 text-[14px] font-medium text-[var(--on-surface-variant)]">总完成组数</p>
        </div>

        <span className="shrink-0 rounded-full bg-[var(--primary-container)] px-3 py-1 text-[12px] font-semibold text-[var(--on-primary-container)]">
          {getSessionStatusLabel(detail.session.status)}
        </span>
      </div>

      <p className="mt-4 text-[13px] leading-5 text-[var(--on-surface-variant)]">{summaryText}</p>
    </section>
  )
}
