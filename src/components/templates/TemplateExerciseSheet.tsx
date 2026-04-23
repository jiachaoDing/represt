import type { FormEvent } from 'react'

import { BottomSheet } from '../ui/BottomSheet'
import type { TemplateExerciseDraft } from '../../lib/template-editor'

type TemplateExerciseSheetProps = {
  draft: TemplateExerciseDraft
  editExerciseId: string | null
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onDraftChange: (draft: TemplateExerciseDraft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function TemplateExerciseSheet({
  draft,
  editExerciseId,
  isOpen,
  isSubmitting,
  onClose,
  onDraftChange,
  onSubmit,
}: TemplateExerciseSheetProps) {
  return (
    <BottomSheet
      open={isOpen}
      title={editExerciseId ? '编辑动作' : '新增动作'}
      onClose={onClose}
    >
      <form className="mt-2 space-y-5" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
            动作名称
          </span>
          <input
            value={draft.name}
            disabled={isSubmitting}
            onChange={(event) => onDraftChange({ ...draft, name: event.target.value })}
            className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
            placeholder="例如：杠铃卧推"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
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
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
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
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
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
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
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
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
              placeholder="可选"
            />
          </label>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !draft.name.trim()}
            className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
          >
            {editExerciseId ? '保存' : '添加动作'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
