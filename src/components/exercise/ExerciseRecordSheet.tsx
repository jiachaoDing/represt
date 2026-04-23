import type { FormEvent } from 'react'

import { BottomSheet } from '../ui/BottomSheet'
import { getCompletedAtLabel } from '../../lib/session-display'

type ExerciseRecordSheetProps = {
  isOpen: boolean
  isSubmitting: boolean
  latestSetRecord: {
    completedAt: string
    setNumber: number
  } | null
  repsInput: string
  weightInput: string
  onClose: () => void
  onRepsChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onWeightChange: (value: string) => void
}

export function ExerciseRecordSheet({
  isOpen,
  isSubmitting,
  latestSetRecord,
  repsInput,
  weightInput,
  onClose,
  onRepsChange,
  onSubmit,
  onWeightChange,
}: ExerciseRecordSheetProps) {
  return (
    <BottomSheet open={isOpen} title="补录上一组" onClose={onClose}>
      {latestSetRecord ? (
        <div className="mt-2 space-y-5">
          <div className="mb-2 flex gap-4">
            <div className="flex-1 rounded-xl bg-[var(--surface-container)] px-4 py-3">
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">组序号</p>
              <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">
                第 {latestSetRecord.setNumber} 组
              </p>
            </div>
            <div className="flex-1 rounded-xl bg-[var(--surface-container)] px-4 py-3">
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">完成时间</p>
              <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">
                {getCompletedAtLabel(latestSetRecord.completedAt)}
              </p>
            </div>
          </div>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
                  重量 (kg)
                </span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  inputMode="decimal"
                  value={weightInput}
                  disabled={isSubmitting}
                  onChange={(event) => onWeightChange(event.target.value)}
                  className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
                />
              </label>

              <label className="block">
                <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
                  次数
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={repsInput}
                  disabled={isSubmitting}
                  onChange={(event) => onRepsChange(event.target.value)}
                  className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
                />
              </label>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
              >
                保存记录
              </button>
            </div>
          </form>
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--on-surface-variant)]">还没有组记录。</p>
      )}
    </BottomSheet>
  )
}
