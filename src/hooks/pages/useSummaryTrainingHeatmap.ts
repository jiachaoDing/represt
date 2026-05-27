import { useEffect, useState } from 'react'

import {
  getSummaryTrainingHeatmap,
  type SummaryTrainingHeatmapData,
} from '../../db/sessions'

export function useSummaryTrainingHeatmap(selectedDateKey: string, enabled: boolean) {
  const [data, setData] = useState<SummaryTrainingHeatmapData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isCancelled = false

    if (!enabled) {
      return () => {
        isCancelled = true
      }
    }

    async function loadHeatmap() {
      try {
        setError(false)
        setIsLoading(true)
        const result = await getSummaryTrainingHeatmap(selectedDateKey)
        if (!isCancelled) {
          setData(result)
        }
      } catch (loadError) {
        if (isCancelled) {
          return
        }

        console.error(loadError)
        setError(true)
        setData(null)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadHeatmap()

    return () => {
      isCancelled = true
    }
  }, [enabled, selectedDateKey])

  return {
    data: enabled ? data : null,
    error: enabled ? error : false,
    isLoading: enabled ? isLoading : false,
  }
}
