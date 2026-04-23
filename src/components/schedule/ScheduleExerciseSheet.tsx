import type { FormEvent } from 'react'

import { BottomSheet } from '../ui/BottomSheet'

type ScheduleExerciseDraft = {
  name: string
  targetSets: string
  restSeconds: string
}

type ScheduleExerciseSheetProps = {
  draft: ScheduleExerciseDraft
  isOpen: boolean
  isSubmitting: boolean
  onClose: () => void
  onDraftChange: (draft: ScheduleExerciseDraft) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function ScheduleExerciseSheet({
  draft,
  isOpen,
  isSubmitting,
  onClose,
  onDraftChange,
  onSubmit,
}: ScheduleExerciseSheetProps) {
  return (
    <BottomSheet open={isOpen} title="手动新建动作" onClose={onClose}>
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
              组数
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

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !draft.name.trim()}
            className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
          >
            添加到今日训练
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}
