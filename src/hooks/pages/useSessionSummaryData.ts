import { useEffect, useState } from 'react'

import {
  getSessionSummaryDetail,
  getSessionSummaryDetailByDateKey,
  getSummaryRangeAnalytics,
  type SessionSummaryDetail,
  type SummaryRange,
  type SummaryRangeAnalytics,
} from '../../db/sessions'

type UseSessionSummaryDataInput = {
  range?: SummaryRange
  sessionDateKey?: string
  sessionId?: string
}

export function useSessionSummaryData({
  range = 'day',
  sessionDateKey,
  sessionId,
}: UseSessionSummaryDataInput) {
  const [analytics, setAnalytics] = useState<SummaryRangeAnalytics | null>(null)
  const [detail, setDetail] = useState<SessionSummaryDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadSummary() {
      try {
        setError(null)
        setIsLoading(true)
        setAnalytics(null)
        setDetail(null)

        const [result, rangeAnalytics] = await Promise.all([
          sessionId
            ? getSessionSummaryDetail(sessionId)
            : sessionDateKey
              ? getSessionSummaryDetailByDateKey(sessionDateKey)
              : null,
          sessionDateKey && !sessionId ? getSummaryRangeAnalytics(sessionDateKey, range) : null,
        ])
        if (isCancelled) {
          return
        }

        setDetail(result)
        setAnalytics(rangeAnalytics)
      } catch (loadError) {
        if (isCancelled) {
          return
        }

        console.error(loadError)
        setError('训练总结加载失败，请返回训练安排页后重试。')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadSummary()

    return () => {
      isCancelled = true
    }
  }, [range, sessionDateKey, sessionId])

  return {
    analytics,
    detail,
    error,
    isLoading,
  }
}
