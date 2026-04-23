import { getRepsLabel, getWeightLabel } from '../../lib/session-display'
import type { SetRecord } from '../../models/types'

type ExerciseLatestRecordCardProps = {
  latestSetRecord: SetRecord | null
  onEdit: () => void
}

export function ExerciseLatestRecordCard({
  latestSetRecord,
  onEdit,
}: ExerciseLatestRecordCardProps) {
  return (
    <section className="mt-4 px-4">
      <div className="rounded-2xl bg-[var(--surface-container)] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--on-surface-variant)]">上一组记录</p>
            {latestSetRecord ? (
              <p className="mt-1 text-[15px] font-medium text-[var(--on-surface)]">
                第 {latestSetRecord.setNumber} 组 · {getWeightLabel(latestSetRecord.weightKg)} ·{' '}
                {getRepsLabel(latestSetRecord.reps)}
              </p>
            ) : (
              <p className="mt-1 text-sm text-[var(--outline)]">没有记录</p>
            )}
          </div>
          <button
            type="button"
            disabled={!latestSetRecord}
            onClick={onEdit}
            className="shrink-0 rounded-full border border-[var(--outline)] px-4 py-2 text-sm font-medium text-[var(--primary)] transition-colors tap-highlight-transparent hover:bg-[var(--surface)] disabled:opacity-35"
          >
            补录
          </button>
        </div>
      </div>
    </section>
  )
}
