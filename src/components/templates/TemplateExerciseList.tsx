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
    <div className="mt-4 flex flex-col px-4">
      {/* Header Row */}
      <div className="flex items-center px-2 pb-2 text-[12px] text-[var(--on-surface-variant)]">
        <div className="w-6 shrink-0" />
        <div className="flex-1 pl-2">动作名称</div>
        <div className="w-[3.5rem] shrink-0 text-center">组数</div>
        <div className="w-[3.5rem] shrink-0 text-center">休息</div>
        <div className="w-[3.5rem] shrink-0 text-center">重量</div>
        <div className="w-[3.5rem] shrink-0 text-center">次数</div>
        <div className="w-6 shrink-0" />
      </div>

      <div className="flex flex-col gap-1">
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
              className="block w-full bg-[var(--surface)] px-2 py-3.5 text-left transition-colors active:bg-[var(--surface-container)] rounded-xl"
            >
              <div className="flex items-center text-[14px]">
                <div className="w-6 shrink-0 text-[15px] font-bold text-[var(--on-surface)]">
                  {index + 1}
                </div>
                <div className="flex-1 pl-2 truncate font-medium text-[var(--on-surface)]">
                  {exercise.name}
                </div>
                <div className="w-[3.5rem] shrink-0 text-center text-[var(--on-surface-variant)]">
                  {exercise.targetSets}组
                </div>
                <div className="w-[3.5rem] shrink-0 text-center text-[var(--on-surface-variant)]">
                  {exercise.restSeconds}秒
                </div>
                <div className="w-[3.5rem] shrink-0 text-center text-[var(--on-surface-variant)]">
                  {exercise.weightKg ? `${exercise.weightKg}kg` : '-'}
                </div>
                <div className="w-[3.5rem] shrink-0 text-center text-[var(--on-surface-variant)]">
                  {exercise.reps ? `${exercise.reps}次` : '-'}
                </div>
                <div className="w-6 shrink-0 flex justify-end text-[var(--outline-variant)]">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </button>
          </SwipeActionItem>
        ))}
      </div>
    </div>
  )
}
