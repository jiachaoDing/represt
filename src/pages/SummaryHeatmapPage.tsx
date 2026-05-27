import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { SummaryTrainingHeatmap } from '../components/summary/SummaryTrainingHeatmap'
import { PageHeader } from '../components/ui/PageHeader'
import { useSummaryTrainingHeatmap } from '../hooks/pages/useSummaryTrainingHeatmap'
import {
  formatSessionDateKey,
  getTodaySessionDateKey,
  isSessionDateKey,
} from '../lib/session-date-key'

export function SummaryHeatmapPage() {
  const { i18n, t } = useTranslation()
  const [searchParams] = useSearchParams()
  const todayDateKey = getTodaySessionDateKey()
  const selectedDateKey = useMemo(() => {
    const currentDate = searchParams.get('date')
    return isSessionDateKey(currentDate) ? currentDate : todayDateKey
  }, [searchParams, todayDateKey])
  const heatmap = useSummaryTrainingHeatmap(selectedDateKey, true)
  const backTo = `/summary?date=${selectedDateKey}&range=month`
  const subtitle = formatSessionDateKey(selectedDateKey, {
    month: 'long',
    year: 'numeric',
  }, i18n.resolvedLanguage ?? i18n.language)

  return (
    <div className="pb-4">
      <PageHeader
        title={t('summary.heatmap.title')}
        subtitle={subtitle}
        backFallbackTo={backTo}
      />
      <SummaryTrainingHeatmap
        data={heatmap.data}
        error={heatmap.error}
        isLoading={heatmap.isLoading}
        variant="page"
      />
    </div>
  )
}
