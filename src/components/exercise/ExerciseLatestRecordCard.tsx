import { useTranslation } from 'react-i18next'

import type { MeasurementType } from '../../domain/exercise-catalog'
import { formatSetRecordValue } from '../../lib/set-record-measurement'
import type { SetRecord } from '../../models/types'

type ExerciseLatestRecordCardProps = {
  latestSetRecord: SetRecord | null
  measurementType: MeasurementType
  onEdit: () => void
}

export function ExerciseLatestRecordCard({
  latestSetRecord,
  measurementType,
  onEdit,
}: ExerciseLatestRecordCardProps) {
  const { t } = useTranslation()
  const latestRecordParts = latestSetRecord
    ? [
        t('summary.setNumber', { setNumber: latestSetRecord.setNumber }),
        formatSetRecordValue(latestSetRecord, measurementType, t),
      ]
    : []

  return (
    <section className="px-5 py-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-[var(--on-surface-variant)]">{t('exercise.latestRecord')}</p>
          {latestSetRecord ? (
            <p className="mt-1.5 text-[15px] font-medium text-[var(--on-surface)]">
              {latestRecordParts.join(' · ')}
            </p>
          ) : (
            <p className="mt-1.5 text-[15px] text-[var(--outline)]">{t('exercise.noRecord')}</p>
          )}
        </div>
        <button
          type="button"
          disabled={!latestSetRecord}
          onClick={onEdit}
          className="shrink-0 px-3 py-2 text-[14px] font-medium text-[#F59E0B] transition-opacity hover:opacity-80 disabled:opacity-35"
        >
          {t('exercise.editRecord')}
        </button>
      </div>
    </section>
  )
}
