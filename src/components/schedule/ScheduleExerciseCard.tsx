import { Link } from 'react-router-dom'

import { deriveExerciseStatus, getExerciseRestLabel } from '../../lib/session-display'
import type { WorkoutSessionWithExercises } from '../../db/sessions'

type ScheduleExercise = WorkoutSessionWithExercises['exercises'][number]

type ScheduleExerciseCardProps = {
  exercise: ScheduleExercise
  href?: string
  index: number
  isDragging?: boolean
  isSelected?: boolean
  isSubmitting: boolean
  linkState?: { backTo: string }
  now: number
  selectionMode?: boolean
}

function SelectionMark({ checked }: { checked: boolean }) {
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

function getExerciseCardState(exercise: ScheduleExercise, now: number, index: number) {
  const status = deriveExerciseStatus(exercise)
  const restLabel = getExerciseRestLabel(exercise, now)
  const isReady = status === 'active' && restLabel === '可继续下一组'
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
      metaText: `${exercise.completedSets} / ${exercise.targetSets} 组`,
      statusText: '已完成 >',
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
      metaText: `${exercise.completedSets} / ${exercise.targetSets} 组`,
      statusText: '可继续下一组 >',
      statusClassName: 'text-[var(--primary)] font-medium',
    }
  }

  if (isResting) {
    return {
      handle: index + 1,
      handleClassName: 'bg-[#F59E0B] text-white font-bold text-sm',
      itemClassName:
        'border border-[#F59E0B]/30 bg-[#FFFBEB] shadow-[0_2px_8px_-4px_rgba(245,158,11,0.15)]',
      nameClassName: 'text-[var(--on-surface)]',
      metaClassName: 'text-[var(--on-surface-variant)]',
      metaText: `${exercise.completedSets} / ${exercise.targetSets} 组`,
      statusText: `休息中 · ${restLabel.replace('倒计时 ', '')} >`,
      statusClassName: 'text-[#D97706] font-medium',
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
    metaText: `${exercise.completedSets} / ${exercise.targetSets} 组`,
    statusText: '未开始 >',
    statusClassName: 'text-[var(--outline)]',
  }
}

export function ScheduleExerciseCard({
  exercise,
  href,
  index,
  isDragging = false,
  isSelected = false,
  isSubmitting,
  linkState,
  now,
  selectionMode = false,
}: ScheduleExerciseCardProps) {
  const cardState = getExerciseCardState(exercise, now, index)
  const handle = selectionMode ? <SelectionMark checked={isSelected} /> : cardState.handle
  const handleClassName = selectionMode
    ? isSelected
      ? 'bg-[var(--primary)] text-[var(--on-primary)]'
      : 'border border-[var(--outline)] bg-transparent text-transparent'
    : cardState.handleClassName
  const content = (
    <div className="min-w-0 flex items-center justify-between">
      <div className="flex min-w-0 flex-col">
        <p className={`truncate text-[16px] font-bold ${cardState.nameClassName}`}>{exercise.name}</p>
        <p className={`mt-0.5 text-[12px] ${cardState.metaClassName}`}>
          {cardState.metaText}
          {exercise.removedFromTemplate ? ' · 模板中已移除' : ''}
        </p>
      </div>
      <div className={`ml-2 shrink-0 text-[13px] ${cardState.statusClassName}`}>
        {cardState.statusText}
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
        } ${isDragging ? 'shadow-[0_10px_28px_-18px_rgba(0,0,0,0.35)]' : ''}`}
      >
        {href ? (
          <Link
            to={href}
            state={linkState}
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
