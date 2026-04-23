import { useEffect, useState } from 'react'

import { getSessionSummaryDetail, type SessionSummaryDetail } from '../../db/sessions'

export function useSessionSummaryData(sessionId: string) {
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

        const result = await getSessionSummaryDetail(sessionId)
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
  }, [sessionId])

  return {
    detail,
    error,
    isLoading,
  }
}
