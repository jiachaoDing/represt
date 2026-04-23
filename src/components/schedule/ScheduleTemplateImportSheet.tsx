import { BottomSheet } from '../ui/BottomSheet'
import type { TemplateWithExercises } from '../../db/templates'

type ScheduleTemplateImportSheetProps = {
  isOpen: boolean
  isSubmitting: boolean
  selectedExerciseIds: string[]
  template: TemplateWithExercises | null
  onClose: () => void
  onSubmit: () => void
  onToggleExercise: (exerciseId: string) => void
}

export function ScheduleTemplateImportSheet({
  isOpen,
  isSubmitting,
  selectedExerciseIds,
  template,
  onClose,
  onSubmit,
  onToggleExercise,
}: ScheduleTemplateImportSheetProps) {
  return (
    <BottomSheet open={isOpen && template !== null} title={template?.name ?? '模板'} onClose={onClose}>
      {template ? (
        <div className="space-y-4">
          <p className="px-1 text-sm text-[var(--on-surface-variant)]">
            选择要导入的动作 ({selectedExerciseIds.length} / {template.exercises.length})
          </p>

          <div className="-mx-2 max-h-[50vh] space-y-1 overflow-y-auto px-2">
            {template.exercises.map((exercise) => (
              <label
                key={exercise.id}
                className="flex cursor-pointer items-center gap-4 rounded-xl px-2 py-3 transition-colors hover:bg-[var(--surface-container)]"
              >
                <div className="relative flex h-5 w-5 items-center justify-center">
                  <input
                    type="checkbox"
                    checked={selectedExerciseIds.includes(exercise.id)}
                    disabled={isSubmitting}
                    onChange={() => onToggleExercise(exercise.id)}
                    className="peer h-5 w-5 shrink-0 appearance-none rounded-sm border-2 border-[var(--outline)] transition-all checked:border-[var(--primary)] checked:bg-[var(--primary)]"
                  />
                  <svg
                    viewBox="0 0 24 24"
                    className="pointer-events-none absolute h-4 w-4 text-[var(--on-primary)] opacity-0 transition-opacity peer-checked:opacity-100"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base text-[var(--on-surface)]">{exercise.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--on-surface-variant)]">
                    {exercise.targetSets} 组 · 休息 {exercise.restSeconds} 秒
                  </p>
                </div>
              </label>
            ))}
          </div>

          {selectedExerciseIds.length === 0 ? (
            <p className="text-sm text-[var(--error)]">至少选择 1 个动作</p>
          ) : null}

          <div className="pt-2">
            <button
              type="button"
              disabled={isSubmitting || selectedExerciseIds.length === 0}
              onClick={onSubmit}
              className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
            >
              加入今日训练
            </button>
          </div>
        </div>
      ) : null}
    </BottomSheet>
  )
}
