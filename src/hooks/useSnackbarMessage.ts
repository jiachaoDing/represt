import { useEffect, useState } from 'react'

export function useSnackbarMessage(timeoutMs = 2200) {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) {
      return
    }

    const timer = window.setTimeout(() => setMessage(null), timeoutMs)
    return () => window.clearTimeout(timer)
  }, [message, timeoutMs])

  return {
    message,
    setMessage,
  }
}
