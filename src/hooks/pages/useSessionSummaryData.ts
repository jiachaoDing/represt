import { useEffect, useState } from 'react'

import {
  getSessionSummaryDetail,
  getSessionSummaryDetailByDateKey,
  type SessionSummaryDetail,
} from '../../db/sessions'

type UseSessionSummaryDataInput = {
  sessionDateKey?: string
  sessionId?: string
}

export function useSessionSummaryData({
  sessionDateKey,
  sessionId,
}: UseSessionSummaryDataInput) {
  const [detail, setDetail] = useState<SessionSummaryDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadSummary() {
      try {
        setError(null)
        setIsLoading(true)
        setDetail(null)

        const result = sessionId
          ? await getSessionSummaryDetail(sessionId)
          : sessionDateKey
            ? await getSessionSummaryDetailByDateKey(sessionDateKey)
            : null
        if (isCancelled) {
          return
        }

        setDetail(result)
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
  }, [sessionDateKey, sessionId])

  return {
    detail,
    error,
    isLoading,
  }
}
