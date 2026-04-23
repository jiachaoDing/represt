import { useParams } from 'react-router-dom'

import { SessionExerciseSummaryList } from '../components/summary/SessionExerciseSummaryList'
import { SessionSummaryOverview } from '../components/summary/SessionSummaryOverview'
import { PageHeader } from '../components/ui/PageHeader'
import { useSessionSummaryData } from '../hooks/pages/useSessionSummaryData'

export function SummaryPage() {
  const { sessionId = 'unknown-session' } = useParams()
  const { detail, error, isLoading } = useSessionSummaryData(sessionId)

  return (
    <div className="space-y-4">
      <PageHeader title="训练总结" backTo="/" />

      {error ? (
        <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <SessionSummaryOverview detail={detail} isLoading={isLoading} />
      <SessionExerciseSummaryList detail={detail} />
    </div>
  )
}
