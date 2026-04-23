import { useEffect, useState } from 'react'

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    // If interval is less than 50ms, use requestAnimationFrame for smoother updates
    if (intervalMs < 50) {
      let frameId: number
      
      const loop = () => {
        setNow(Date.now())
        frameId = window.requestAnimationFrame(loop)
      }
      
      frameId = window.requestAnimationFrame(loop)
      return () => window.cancelAnimationFrame(frameId)
    }

    const timerId = window.setInterval(() => {
      setNow(Date.now())
    }, intervalMs)

    return () => {
      window.clearInterval(timerId)
    }
  }, [intervalMs])

  return now
}
