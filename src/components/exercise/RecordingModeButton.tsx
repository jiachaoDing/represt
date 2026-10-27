import { useTranslation } from 'react-i18next'

import type { MeasurementType } from '../../domain/exercise-catalog'
import { getNextRecordingMode } from '../../lib/set-record-measurement'

type RecordingModeButtonProps = {
  value: MeasurementType
  disabled?: boolean
  className?: string
  onChange: (value: MeasurementType) => void
}

export function RecordingModeButton({ value, disabled, className = '', onChange }: RecordingModeButtonProps) {
  const { t } = useTranslation()
  const mode = t(`summary.exerciseRecords.measurementTypeOptions.${value}`)
  const label = t('exercise.switchRecordingMode', {
    current: mode,
    next: t(`summary.exerciseRecords.measurementTypeOptions.${getNextRecordingMode(value)}`),
  })

  return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(getNextRecordingMode(value))}
        aria-label={label}
        title={label}
        className={`flex h-8 w-11 items-center justify-center rounded-full outline-none transition-colors hover:bg-[var(--on-surface-variant)]/10 focus-visible:ring-2 focus-visible:ring-[var(--primary)] disabled:opacity-40 ${className}`}
      >
        <span aria-hidden="true" className="h-3 w-3 rounded-full" style={{ backgroundColor: `var(--recording-${value})` }} />
      </button>
  )
}
