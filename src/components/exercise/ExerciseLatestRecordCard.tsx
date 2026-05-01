import { useTranslation } from 'react-i18next'
import { Activity, CheckCircle2, ChevronRight } from 'lucide-react'

import type { MeasurementType } from '../../domain/exercise-catalog'
import { formatSetRecordValue } from '../../lib/set-record-measurement'
import type { SetRecord } from '../../models/types'

type ExerciseLatestRecordCardProps = {
  isResting: boolean
  latestSetRecord: SetRecord | null
  measurementType: MeasurementType
  onEdit: () => void
  restSeconds: number
}

export function ExerciseLatestRecordCard({
  isResting,
  latestSetRecord,
  measurementType,
  onEdit,
  restSeconds,
}: ExerciseLatestRecordCardProps) {
  const { t } = useTranslation()
  const toneClass = isResting ? 'text-[var(--tertiary)]' : 'text-[var(--primary)]'
  const iconBgClass = isResting ? 'bg-[var(--tertiary-container)]' : 'bg-[var(--primary-container)]'
  const latestRecordParts = latestSetRecord
    ? [
        t('summary.setNumber', { setNumber: latestSetRecord.setNumber }),
        formatSetRecordValue(latestSetRecord, measurementType, t),
      ]
    : []

  return (
    <section className="border-t border-[var(--outline-variant)]/45 py-6">
      <div className="mb-5 flex items-center gap-4">
        <h2 className="shrink-0 text-[12px] font-semibold uppercase tracking-[0.18em] text-[var(--on-surface-variant)]">
          {t('exercise.latestRecord')}
        </h2>
        <div className="h-[1px] flex-1 bg-[var(--outline-variant)]/55" />
      </div>

      <div className="flex min-h-12 items-center gap-4">
        <div
          className={[
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            latestSetRecord ? iconBgClass : 'bg-[var(--surface-container)]',
          ].join(' ')}
        >
          {latestSetRecord ? (
            <CheckCircle2 className={toneClass} size={20} strokeWidth={2.2} aria-hidden="true" />
          ) : (
            <Activity className="text-[var(--on-surface-variant)]" size={20} strokeWidth={2.2} aria-hidden="true" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {latestSetRecord ? (
            <p className="truncate text-[17px] font-medium text-[var(--on-surface)]">
              {latestRecordParts.join(' · ')}
            </p>
          ) : (
            <p className="text-[17px] font-medium text-[var(--on-surface)]">{t('exercise.noRecord')}</p>
          )}
          {latestSetRecord ? (
            <p className="mt-0.5 text-[14px] text-[var(--on-surface-variant)]">
              {t('exercise.restSecondsValue', { seconds: restSeconds })}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          disabled={!latestSetRecord}
          onClick={onEdit}
          className={[
            'inline-flex shrink-0 items-center gap-1 px-1 py-2 text-[15px] font-medium transition-opacity hover:opacity-80 disabled:opacity-35',
            toneClass,
          ].join(' ')}
        >
          {t('exercise.editRecord')}
          <ChevronRight size={18} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}
