import { SwipeActionItem } from '../ui/SwipeActionItem'
import { getRepsLabel, getWeightLabel } from '../../lib/session-display'
import type { TemplateWithExercises } from '../../db/templates'

type TemplateExerciseListProps = {
  currentTemplate: TemplateWithExercises | null
  isLoading: boolean
  isSubmitting: boolean
  templatesCount: number
  onCreate: () => void
  onDelete: (exerciseId: string) => void
  onEdit: (exerciseId: string) => void
}

export function TemplateExerciseList({
  currentTemplate,
  isLoading,
  isSubmitting,
  templatesCount,
  onCreate,
  onDelete,
  onEdit,
}: TemplateExerciseListProps) {
  if (isLoading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-[4.5rem] animate-pulse border-b border-[var(--outline-variant)] bg-[var(--surface-container)] opacity-50"
          />
        ))}
      </div>
    )
  }

  if (templatesCount === 0) {
    return (
      <div className="mx-4 mt-6 rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
        <p className="text-sm font-medium text-[var(--on-surface-variant)]">还没有模板</p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex items-center text-sm font-medium text-[var(--primary)]"
        >
          新建模板
        </button>
      </div>
    )
  }

  if (!currentTemplate) {
    return null
  }

  if (currentTemplate.exercises.length === 0) {
    return (
      <div className="mx-4 mt-6 rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
        <p className="text-sm font-medium text-[var(--on-surface-variant)]">这个模板还没有动作</p>
        <button
          type="button"
          onClick={onCreate}
          className="mt-4 inline-flex items-center text-sm font-medium text-[var(--primary)]"
        >
          添加动作
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-col border-y border-[var(--outline-variant)]">
      {currentTemplate.exercises.map((exercise, index) => (
        <SwipeActionItem
          key={exercise.id}
          actionLabel="删除"
          disabled={isSubmitting}
          onAction={() => onDelete(exercise.id)}
        >
          <button
            type="button"
            onClick={() => onEdit(exercise.id)}
            className={`block w-full bg-[var(--surface)] px-4 py-4 text-left ${index !== 0 ? 'border-t border-[var(--outline-variant)]' : ''}`}
          >
            <div className="flex items-center gap-3">
              <svg
                viewBox="0 0 24 24"
                width="20"
                height="20"
                className="shrink-0 text-[var(--outline)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="9" cy="12" r="1" />
                <circle cx="9" cy="5" r="1" />
                <circle cx="9" cy="19" r="1" />
                <circle cx="15" cy="12" r="1" />
                <circle cx="15" cy="5" r="1" />
                <circle cx="15" cy="19" r="1" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base text-[var(--on-surface)]">{exercise.name}</p>
                <p className="mt-0.5 text-sm text-[var(--on-surface-variant)]">
                  {exercise.targetSets} 组 · 休息 {exercise.restSeconds} 秒
                </p>
                <p className="mt-0.5 text-xs text-[var(--outline)]">
                  {getWeightLabel(exercise.weightKg ?? null)} · {getRepsLabel(exercise.reps ?? null)}
                </p>
              </div>
            </div>
          </button>
        </SwipeActionItem>
      ))}
    </div>
  )
}
