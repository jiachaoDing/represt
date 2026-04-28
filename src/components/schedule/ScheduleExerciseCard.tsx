import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { deriveExerciseStatus } from '../../lib/session-display'
import { formatDuration, getRestTimerSnapshot, getRestTimerState } from '../../lib/rest-timer'
import type { WorkoutSessionWithExercises } from '../../db/sessions'

type ScheduleExercise = WorkoutSessionWithExercises['exercises'][number]

type ScheduleExerciseCardProps = {
  exercise: ScheduleExercise
  href?: string
  index: number
  isDragging?: boolean
  isSelectable?: boolean
  isSelected?: boolean
  isSubmitting: boolean
  linkState?: { backTo: string }
  now: number
  selectionMode?: boolean
}

function SelectionMark({ checked, disabled }: { checked: boolean; disabled: boolean }) {
  if (disabled) {
    return (
      <svg
        viewBox="0 0 24 24"
        width="15"
        height="15"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="8" />
        <path d="m7 17 10-10" />
      </svg>
    )
  }

  return checked ? (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  ) : null
}

function getExerciseCardState(
  exercise: ScheduleExercise,
  now: number,
  index: number,
  t: ReturnType<typeof useTranslation>['t'],
) {
  const status = deriveExerciseStatus(exercise)
  const restSnapshot = getRestTimerSnapshot(getRestTimerState(exercise), now)
  const isReady = status === 'active' && restSnapshot.status === 'ready'
  const isResting = status === 'active' && !isReady

  if (status === 'completed') {
    return {
      handle: (
        <svg
          viewBox="0 0 24 24"
          width="16"
          height="16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      handleClassName: 'bg-[var(--primary)] text-white',
      itemClassName: 'border border-[var(--outline-variant)]/30 bg-[var(--surface)] opacity-70',
      nameClassName: 'text-[var(--on-surface-variant)] line-through',
      metaClassName: 'text-[var(--outline)]',
      metaText: t('schedule.progressSets', { completed: exercise.completedSets, total: exercise.targetSets }),
      statusText: t('schedule.completed'),
      statusClassName: 'text-[var(--outline)]',
    }
  }

  if (isReady) {
    return {
      handle: index + 1,
      handleClassName: 'bg-[var(--primary)] text-white font-bold text-sm',
      itemClassName:
        'border border-[var(--primary)]/30 bg-[var(--primary-container)]/10 shadow-[0_2px_8px_-4px_rgba(22,78,48,0.15)]',
      nameClassName: 'text-[var(--on-surface)]',
      metaClassName: 'text-[var(--on-surface-variant)]',
      metaText: t('schedule.progressSets', { completed: exercise.completedSets, total: exercise.targetSets }),
      statusText: t('schedule.ready'),
      statusClassName: 'text-[var(--primary)] font-medium',
    }
  }

  if (isResting) {
    return {
      handle: index + 1,
      handleClassName: 'bg-[var(--tertiary)] text-[var(--on-tertiary)] font-bold text-sm',
      itemClassName:
        'border border-[var(--tertiary)]/40 bg-[var(--tertiary-container)] shadow-[0_2px_8px_-4px_rgba(182,141,64,0.18)]',
      nameClassName: 'text-[var(--on-tertiary-container)]',
      metaClassName: 'text-[var(--on-tertiary-container)]',
      metaText: t('schedule.progressSets', { completed: exercise.completedSets, total: exercise.targetSets }),
      statusText: t('schedule.resting', { time: formatDuration(restSnapshot.remainingSeconds) }),
      statusClassName: 'text-[var(--tertiary)] font-medium',
    }
  }

  return {
    handle: index + 1,
    handleClassName:
      'bg-[var(--surface-container)] text-[var(--on-surface-variant)] font-bold text-sm',
    itemClassName:
      'border border-[var(--outline-variant)]/30 bg-[var(--surface)] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]',
    nameClassName: 'text-[var(--on-surface)]',
    metaClassName: 'text-[var(--on-surface-variant)]',
    metaText: t('schedule.progressSets', { completed: exercise.completedSets, total: exercise.targetSets }),
    statusText: t('schedule.notStarted'),
    statusClassName: 'text-[var(--outline)]',
  }
}

export function ScheduleExerciseCard({
  exercise,
  href,
  index,
  isDragging = false,
  isSelectable = true,
  isSelected = false,
  isSubmitting,
  linkState,
  now,
  selectionMode = false,
}: ScheduleExerciseCardProps) {
  const { t } = useTranslation()
  const cardState = getExerciseCardState(exercise, now, index, t)
  const isSelectionDisabled = selectionMode && !isSelectable
  const handle = selectionMode
    ? <SelectionMark checked={isSelected} disabled={isSelectionDisabled} />
    : cardState.handle
  const handleClassName = selectionMode
    ? isSelectionDisabled
      ? 'border border-[var(--outline-variant)] bg-[var(--surface-container)] text-[var(--outline)]'
      : isSelected
      ? 'bg-[var(--primary)] text-[var(--on-primary)]'
      : 'border border-[var(--outline)] bg-transparent text-transparent'
    : cardState.handleClassName
  const statusText = isSelectionDisabled ? t('schedule.notDeletable') : cardState.statusText
  const statusClassName = isSelectionDisabled
    ? 'text-[var(--outline)]'
    : cardState.statusClassName
  const content = (
    <div className="min-w-0 flex items-center justify-between">
      <div className="flex min-w-0 flex-col">
        <p className={`truncate text-[16px] font-bold ${cardState.nameClassName}`}>{exercise.name}</p>
        <p className={`mt-0.5 text-[12px] ${cardState.metaClassName}`}>{cardState.metaText}</p>
      </div>
      <div className={`ml-2 shrink-0 text-[13px] ${statusClassName}`}>
        {statusText}
      </div>
    </div>
  )

  return (
    <div className="relative">
      <div
        className={`absolute left-4 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full transition-colors ${
          handleClassName
        } ${isSubmitting ? 'opacity-40' : ''}`}
        aria-hidden="true"
      >
        {handle}
      </div>

      <div
        className={`rounded-[1.25rem] pl-16 pr-4 py-4 transition-shadow duration-200 ${
          cardState.itemClassName
        } ${isSelectionDisabled ? 'opacity-50' : ''} ${
          isDragging ? 'shadow-[0_10px_28px_-18px_rgba(0,0,0,0.35)]' : ''
        }`}
      >
        {href ? (
          <Link
            to={href}
            state={linkState}
            viewTransition
            className="block w-full transition-transform active:scale-[0.98]"
          >
            {content}
          </Link>
        ) : (
          content
        )}
      </div>
    </div>
  )
}
