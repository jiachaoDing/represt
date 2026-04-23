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
    <section className="px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-[var(--on-surface-variant)]">上一组记录</p>
          {latestSetRecord ? (
            <p className="mt-1.5 text-[15px] font-medium text-[var(--on-surface)]">
              第 {latestSetRecord.setNumber} 组 · {getWeightLabel(latestSetRecord.weightKg)} ·{' '}
              {getRepsLabel(latestSetRecord.reps)}
            </p>
          ) : (
            <p className="mt-1.5 text-[15px] text-[var(--outline)]">没有记录</p>
          )}
        </div>
        <button
          type="button"
          disabled={!latestSetRecord}
          onClick={onEdit}
          className="shrink-0 px-3 py-2 text-[14px] font-medium text-[#F59E0B] transition-opacity hover:opacity-80 disabled:opacity-35"
        >
          补录
        </button>
      </div>
    </section>
  )
}
