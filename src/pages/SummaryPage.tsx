import { useParams } from 'react-router-dom'

import { SessionExerciseSummaryList } from '../components/summary/SessionExerciseSummaryList'
import { SessionSummaryOverview } from '../components/summary/SessionSummaryOverview'
import { useNow } from '../hooks/useNow'
import { useSessionSummaryData } from '../hooks/pages/useSessionSummaryData'

export function SummaryPage() {
  const { sessionId = 'unknown-session' } = useParams()
  const now = useNow()
  const { detail, error, isLoading } = useSessionSummaryData(sessionId)

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <SessionSummaryOverview detail={detail} isLoading={isLoading} now={now} />
      <SessionExerciseSummaryList detail={detail} />
    </div>
  )
}
