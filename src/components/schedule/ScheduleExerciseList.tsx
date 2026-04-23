import { Link } from 'react-router-dom'

import { SwipeActionItem } from '../ui/SwipeActionItem'
import { deriveExerciseStatus, getExerciseRestLabel } from '../../lib/session-display'
import type { WorkoutSessionWithExercises } from '../../db/sessions'

type ScheduleExerciseListProps = {
  currentSession: WorkoutSessionWithExercises | null
  hasTemplates: boolean
  isLoading: boolean
  now: number
  onDelete: (exerciseId: string) => void
  onOpenAdd: () => void
}

function getExerciseCardState(
  exercise: WorkoutSessionWithExercises['exercises'][number],
  now: number,
  index: number,
) {
  const status = deriveExerciseStatus(exercise)
  const restLabel = getExerciseRestLabel(exercise, now)
  const isReady = status === 'active' && restLabel === '可继续下一组'
  const isResting = status === 'active' && !isReady

  if (status === 'completed') {
    return {
      icon: (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      ),
      itemClassName: 'border border-[var(--outline-variant)]/30 bg-[var(--surface)] opacity-70',
      nameClassName: 'text-[var(--on-surface-variant)] line-through',
      metaClassName: 'text-[var(--outline)]',
      metaText: `${exercise.completedSets} / ${exercise.targetSets} 组`,
      statusText: '已完成 >',
      statusClassName: 'text-[var(--outline)]',
    }
  }

  if (isReady) {
    return {
      icon: (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-white font-bold text-sm">
          {index + 1}
        </div>
      ),
      itemClassName: 'border border-[var(--primary)]/30 bg-[var(--primary-container)]/10 shadow-[0_2px_8px_-4px_rgba(22,78,48,0.15)]',
      nameClassName: 'text-[var(--on-surface)]',
      metaClassName: 'text-[var(--on-surface-variant)]',
      metaText: `${exercise.completedSets} / ${exercise.targetSets} 组`,
      statusText: '可继续下一组 >',
      statusClassName: 'text-[var(--primary)] font-medium',
    }
  }

  if (isResting) {
    return {
      icon: (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F59E0B] text-white font-bold text-sm">
          {index + 1}
        </div>
      ),
      itemClassName: 'border border-[#F59E0B]/30 bg-[#FFFBEB] shadow-[0_2px_8px_-4px_rgba(245,158,11,0.15)]',
      nameClassName: 'text-[var(--on-surface)]',
      metaClassName: 'text-[var(--on-surface-variant)]',
      metaText: `${exercise.completedSets} / ${exercise.targetSets} 组`,
      statusText: `休息中 · ${restLabel.replace('倒计时 ', '')} >`,
      statusClassName: 'text-[#D97706] font-medium',
    }
  }

  return {
    icon: (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--on-surface-variant)] font-bold text-sm">
        {index + 1}
      </div>
    ),
    itemClassName: 'border border-[var(--outline-variant)]/30 bg-[var(--surface)] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]',
    nameClassName: 'text-[var(--on-surface)]',
    metaClassName: 'text-[var(--on-surface-variant)]',
    metaText: `${exercise.completedSets} / ${exercise.targetSets} 组`,
    statusText: '未开始 >',
    statusClassName: 'text-[var(--outline)]',
  }
}

export function ScheduleExerciseList({
  currentSession,
  hasTemplates,
  isLoading,
  now,
  onDelete,
  onOpenAdd,
}: ScheduleExerciseListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 px-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[5rem] animate-pulse rounded-2xl bg-[var(--surface-container)] opacity-50"
          />
        ))}
      </div>
    )
  }

  if (!currentSession || currentSession.exercises.length === 0) {
    return (
      <div className="mx-4 rounded-2xl border border-dashed border-[var(--outline)] px-5 py-10 text-center">
        <p className="text-sm font-medium text-[var(--on-surface-variant)]">今天还没有动作</p>
        <button
          type="button"
          onClick={onOpenAdd}
          className="mt-4 text-sm font-medium text-[var(--primary)]"
        >
          {hasTemplates ? '添加动作' : '新建动作'}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4">
      {currentSession.exercises.map((exercise, index) => {
        const cardState = getExerciseCardState(exercise, now, index)
        const canDelete = exercise.status === 'pending' && exercise.completedSets === 0

        return (
          <SwipeActionItem
            key={exercise.id}
            actionLabel="删除"
            disabled={!canDelete}
            onAction={() => onDelete(exercise.id)}
          >
            <Link
              to={`/exercise/${exercise.id}`}
              className={`block w-full rounded-[1.25rem] px-4 py-4 transition-transform active:scale-[0.98] ${cardState.itemClassName}`}
            >
              <div className="flex items-center gap-4">
                {cardState.icon}
                <div className="min-w-0 flex-1 flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className={`truncate text-[16px] font-bold ${cardState.nameClassName}`}>
                      {exercise.name}
                    </p>
                    <p className={`mt-0.5 text-[12px] ${cardState.metaClassName}`}>
                      {cardState.metaText}
                    </p>
                  </div>
                  <div className={`text-[13px] shrink-0 ml-2 ${cardState.statusClassName}`}>
                    {cardState.statusText}
                  </div>
                </div>
              </div>
            </Link>
          </SwipeActionItem>
        )
      })}
    </div>
  )
}
