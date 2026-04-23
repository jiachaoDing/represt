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
) {
  const status = deriveExerciseStatus(exercise)
  const restLabel = getExerciseRestLabel(exercise, now)
  const isReady = status === 'active' && restLabel === '可继续下一组'
  const isResting = status === 'active' && !isReady

  if (status === 'completed') {
    return {
      icon: (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--primary)]">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
      ),
      itemClassName: 'bg-[var(--surface-container)] opacity-60',
      nameClassName: 'text-[var(--on-surface-variant)] line-through',
      metaClassName: 'text-[var(--outline)]',
      metaText: `${exercise.completedSets} / ${exercise.targetSets} 组`,
      status,
    }
  }

  if (isReady) {
    return {
      icon: (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] shadow-sm">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      ),
      itemClassName: 'border-l-4 border-[var(--primary)] bg-[var(--primary-container)] shadow-sm',
      nameClassName: 'text-[var(--on-surface)]',
      metaClassName: 'font-semibold text-[var(--primary)]',
      metaText: restLabel,
      status,
    }
  }

  if (isResting) {
    return {
      icon: (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--tertiary)] text-[var(--on-tertiary)]">
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
      ),
      itemClassName: 'border-l-4 border-[var(--tertiary)] bg-[var(--tertiary-container)]',
      nameClassName: 'text-[var(--on-surface)]',
      metaClassName: 'font-semibold text-[var(--tertiary)]',
      metaText: restLabel,
      status,
    }
  }

  return {
    icon: (
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--on-surface-variant)]">
        <svg
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    ),
    itemClassName: 'border border-[var(--outline-variant)] bg-[var(--surface)]',
    nameClassName: 'text-[var(--on-surface)]',
    metaClassName: 'text-[var(--on-surface-variant)]',
    metaText: `${exercise.completedSets} / ${exercise.targetSets} 组`,
    status,
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
    <div className="flex flex-col gap-3 px-2">
      {currentSession.exercises.map((exercise) => {
        const cardState = getExerciseCardState(exercise, now)
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
              className={`block w-full rounded-2xl px-4 py-4 transition-transform active:scale-[0.98] ${cardState.itemClassName}`}
            >
              <div className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[17px] font-medium ${cardState.nameClassName}`}>
                    {exercise.name}
                  </p>
                  <p className={`mt-1 text-[13px] ${cardState.metaClassName}`}>
                    {cardState.metaText}
                  </p>
                </div>
                {cardState.icon}
              </div>
            </Link>
          </SwipeActionItem>
        )
      })}
    </div>
  )
}
