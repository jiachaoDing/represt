import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
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
        setError(t('growth.loadFailed'))
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
  }, [range, sessionDateKey, sessionId, t])

  return {
    analytics,
    detail,
    error,
    isLoading,
  }
}
