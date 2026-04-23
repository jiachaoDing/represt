import { useParams } from 'react-router-dom'

import { SessionExerciseSummaryList } from '../components/summary/SessionExerciseSummaryList'
import { SessionSummaryOverview } from '../components/summary/SessionSummaryOverview'
import { PageHeader } from '../components/ui/PageHeader'
import { useSessionSummaryData } from '../hooks/pages/useSessionSummaryData'

export function SummaryPage() {
  const { sessionId = 'unknown-session' } = useParams()
  const { detail, error, isLoading } = useSessionSummaryData(sessionId)

  return (
    <div className="pb-4">
      <PageHeader title="训练总结" backTo="/" />

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      <SessionSummaryOverview detail={detail} isLoading={isLoading} />
      <SessionExerciseSummaryList detail={detail} />
    </div>
  )
}
