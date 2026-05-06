import { useTranslation } from 'react-i18next'

import type { ExerciseRecordMetric } from '../../db/sessions'
import { formatMetricValue } from './utils'

export function MetricValue({ metric }: { metric: ExerciseRecordMetric | null }) {
  const { t } = useTranslation()

  return (
    <span>
      {metric ? formatMetricValue(metric.kind, metric.value, t) : t('summary.exerciseRecords.noPb')}
    </span>
  )
}
