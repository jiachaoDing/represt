import type { FormEvent } from 'react'

import type { TemplateWithExercises } from '../../db/templates'
import type { TemplateExerciseDraft } from '../../lib/template-editor'
import { SwipeActionItem } from '../ui/SwipeActionItem'
import { TemplateExerciseInlineEditor } from './TemplateExerciseInlineEditor'

type TemplateExerciseListProps = {
  currentTemplate: TemplateWithExercises | null
  draft: TemplateExerciseDraft
  editExerciseId: string | null
  isCreatingExercise: boolean
  isLoading: boolean
  isSubmitting: boolean
  templatesCount: number
  onCancelEditing: () => void
  onCreate: () => void
  onDelete: (exerciseId: string) => void
  onDraftChange: (draft: TemplateExerciseDraft) => void
  onEdit: (exerciseId: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function TemplateExerciseList({
  currentTemplate,
  draft,
  editExerciseId,
  isCreatingExercise,
  isLoading,
  isSubmitting,
  templatesCount,
  onCancelEditing,
  onCreate,
  onDelete,
  onDraftChange,
  onEdit,
  onSubmit,
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
      </div>
    )
  }

  if (!currentTemplate) {
    return null
  }

  const shouldShowEmptyHint = currentTemplate.exercises.length === 0 && !isCreatingExercise

  return (
    <div className="mt-4 px-4">
      {shouldShowEmptyHint ? (
        <div className="rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
          <p className="text-sm font-medium text-[var(--on-surface-variant)]">这个模板还没有动作</p>
          <button
            type="button"
            onClick={onCreate}
            className="mt-4 inline-flex items-center text-sm font-medium text-[var(--primary)]"
          >
            添加动作
          </button>
        </div>
      ) : null}

      {!shouldShowEmptyHint ? (
        <div className="flex items-center justify-between px-2 pb-2">
          <div className="text-[12px] text-[var(--on-surface-variant)]">
            左滑可删除，点右侧铅笔可编辑
          </div>
          <button
            type="button"
            onClick={onCreate}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
            aria-label="添加动作"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {currentTemplate.exercises.map((exercise, index) => {
          if (editExerciseId === exercise.id) {
            return (
              <TemplateExerciseInlineEditor
                key={exercise.id}
                draft={draft}
                isEditing
                isSubmitting={isSubmitting}
                onCancel={onCancelEditing}
                onDraftChange={onDraftChange}
                onSubmit={onSubmit}
              />
            )
          }

          return (
            <SwipeActionItem
              key={exercise.id}
              actionLabel="删除"
              disabled={isSubmitting}
              onAction={() => onDelete(exercise.id)}
            >
              <div className="rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-4 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5 text-[15px] font-bold text-[var(--on-surface)]">
                    {index + 1}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[15px] font-semibold text-[var(--on-surface)]">
                      {exercise.name}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-[var(--on-surface-variant)]">
                      <span>{exercise.targetSets} 组</span>
                      <span>{exercise.restSeconds} 秒</span>
                      <span>{exercise.weightKg ? `${exercise.weightKg} kg` : '重量 -'}</span>
                      <span>{exercise.reps ? `${exercise.reps} 次` : '次数 -'}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEdit(exercise.id)}
                    disabled={isSubmitting}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)] disabled:opacity-40"
                    aria-label={`编辑${exercise.name}`}
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                  </button>
                </div>
              </div>
            </SwipeActionItem>
          )
        })}

        {isCreatingExercise ? (
          <TemplateExerciseInlineEditor
            draft={draft}
            isEditing={false}
            isSubmitting={isSubmitting}
            onCancel={onCancelEditing}
            onDraftChange={onDraftChange}
            onSubmit={onSubmit}
          />
        ) : null}
      </div>
    </div>
  )
}
