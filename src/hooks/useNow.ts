import { useEffect, useState } from 'react'

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timerId = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)

    return () => {
      window.clearInterval(timerId)
    }
  }, [intervalMs])

  return now
}
