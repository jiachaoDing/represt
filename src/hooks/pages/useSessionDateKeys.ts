import { useEffect, useState } from 'react'

import { listSessionDateKeys } from '../../db/sessions'

export function useSessionDateKeys() {
  const [sessionDateKeys, setSessionDateKeys] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    async function loadSessionDateKeys() {
      try {
        setError(null)
        setIsLoading(true)

        const result = await listSessionDateKeys()
        if (isCancelled) {
          return
        }

        setSessionDateKeys(result)
      } catch (loadError) {
        if (isCancelled) {
          return
        }

        console.error(loadError)
        setError('训练日期加载失败，请稍后重试。')
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadSessionDateKeys()

    return () => {
      isCancelled = true
    }
  }, [])

  return {
    error,
    isLoading,
    sessionDateKeys,
  }
}
