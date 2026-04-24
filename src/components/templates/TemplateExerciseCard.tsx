import { SwipeActionItem } from '../ui/SwipeActionItem'

import type { TemplateExerciseCardProps } from './template-exercise-list.types'

export function TemplateExerciseCard({
  exercise,
  index,
  isDragging = false,
  isSubmitting,
  onDelete,
  onEdit,
  dragHandleProps,
}: TemplateExerciseCardProps) {
  const content = (
    <div
      className={`rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-4 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] transition-shadow duration-200 ${
        isDragging ? 'shadow-[0_16px_40px_-18px_rgba(0,0,0,0.35)]' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isSubmitting}
          ref={dragHandleProps?.setActivatorNodeRef}
          className={`flex w-6 shrink-0 justify-center text-[15px] font-bold text-[var(--on-surface)] transition-colors ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab active:cursor-grabbing'
          } disabled:cursor-default disabled:opacity-40`}
          style={{ touchAction: 'manipulation' }}
          aria-label={`长按拖动调整“${exercise.name}”顺序`}
          {...dragHandleProps?.attributes}
          {...dragHandleProps?.listeners}
        >
          {index + 1}
        </button>

        <div className="min-w-0 flex-1 py-0.5">
          <div className="truncate text-[15px] font-semibold text-[var(--on-surface)]">
            {exercise.name}
          </div>
          <div className="mt-2 flex flex-wrap gap-y-1 text-[13px] text-[var(--on-surface-variant)]">
            <span className="w-14 shrink-0">{exercise.targetSets} 组</span>
            <span className="w-16 shrink-0">{exercise.restSeconds} 秒</span>
            <span className="w-20 shrink-0">{exercise.weightKg ? `${exercise.weightKg} kg` : '重量 -'}</span>
            <span className="shrink-0">{exercise.reps ? `${exercise.reps} 次` : '次数 -'}</span>
          </div>
        </div>

        {onEdit ? (
          <button
            type="button"
            onClick={() => onEdit(exercise.id)}
            disabled={isSubmitting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)] disabled:opacity-40"
            aria-label={`编辑${exercise.name}`}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
            </svg>
          </button>
        ) : null}
      </div>
    </div>
  )

  if (!onDelete) {
    return content
  }

  return (
    <SwipeActionItem
      actionLabel="删除"
      disabled={isSubmitting || isDragging}
      onAction={() => onDelete(exercise.id)}
    >
      {content}
    </SwipeActionItem>
  )
}
