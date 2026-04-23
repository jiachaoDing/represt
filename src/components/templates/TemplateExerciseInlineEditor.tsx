import type { FormEvent } from 'react'

import type { TemplateExerciseDraft } from '../../lib/template-editor'

type TemplateExerciseInlineEditorProps = {
  draft: TemplateExerciseDraft
  isEditing: boolean
  isSubmitting: boolean
  onCancel: () => void
  onDraftChange: (draft: TemplateExerciseDraft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function TemplateExerciseInlineEditor({
  draft,
  isEditing,
  isSubmitting,
  onCancel,
  onDraftChange,
  onSubmit,
}: TemplateExerciseInlineEditorProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="rounded-[1.25rem] border border-[var(--outline-variant)]/30 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]"
    >
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
            动作名称
          </span>
          <input
            value={draft.name}
            disabled={isSubmitting}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
            placeholder="例如：杠铃卧推"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
              默认组数
            </span>
            <input
              type="number"
              min={1}
              inputMode="numeric"
              value={draft.targetSets}
              disabled={isSubmitting}
              onChange={(event) => onDraftChange({ ...draft, targetSets: event.target.value })}
              className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
            />
          </label>

          <label className="block">
            <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
              休息秒数
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.restSeconds}
              disabled={isSubmitting}
              onChange={(event) => onDraftChange({ ...draft, restSeconds: event.target.value })}
              className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
              默认重量 (kg)
            </span>
            <input
              type="number"
              min={0}
              step="0.5"
              inputMode="decimal"
              value={draft.weightKg}
              disabled={isSubmitting}
              onChange={(event) => onDraftChange({ ...draft, weightKg: event.target.value })}
              className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
              placeholder="可选"
            />
          </label>

          <label className="block">
            <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
              默认次数
            </span>
            <input
              type="number"
              min={0}
              inputMode="numeric"
              value={draft.reps}
              disabled={isSubmitting}
              onChange={(event) => onDraftChange({ ...draft, reps: event.target.value })}
              className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
              placeholder="可选"
            />
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--surface-container)] px-4 text-sm font-medium text-[var(--on-surface)] transition-opacity disabled:opacity-40"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !draft.name.trim()}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
          >
            {isEditing ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </form>
  )
}
