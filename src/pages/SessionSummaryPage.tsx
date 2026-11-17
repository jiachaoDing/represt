import { useTranslation } from 'react-i18next'
import { SessionExerciseSummaryList } from '../components/summary/SessionExerciseSummaryList'
import { SessionSummaryOverview } from '../components/summary/SessionSummaryOverview'
import { PageHeader } from '../components/ui/PageHeader'
import { useSessionSummaryData } from '../hooks/pages/useSessionSummaryData'
import { formatSessionDateKey } from '../lib/session-date-key'
import { buildDaySummaryExportText } from '../lib/summary-export-text'

export function SessionSummaryPage({ sessionId, date }: { sessionId?: string; date?: string }) {
  const { t, i18n } = useTranslation()
  const { detail, analytics, error, isLoading } = useSessionSummaryData({ sessionId, sessionDateKey: date })
  const dateKey = detail?.session.sessionDateKey ?? date
  const exportText = detail && detail.exercises.length > 0
    ? buildDaySummaryExportText(detail, analytics, t, i18n.resolvedLanguage ?? i18n.language) : null
  return <div className="pb-6">
    <PageHeader title={t('summary.detailTitle')} backFallbackTo="/summary" subtitle={dateKey ? formatSessionDateKey(dateKey, { year: 'numeric', month: 'long', day: 'numeric' }, i18n.resolvedLanguage) : undefined} />
    {error && <p role="alert" className="m-4 text-sm text-[var(--error)]">{error}</p>}
    <SessionSummaryOverview detail={detail} exportText={exportText} isLoading={isLoading} />
    <SessionExerciseSummaryList detail={detail} />
  </div>
}
