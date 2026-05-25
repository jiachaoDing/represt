import { useEffect, useState } from 'react'

import { useAppResume } from './useAppResume'

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())

  useAppResume(() => {
    setNow(Date.now())
  })

  useEffect(() => {
    // If interval is less than 50ms, use requestAnimationFrame for smoother updates
    if (intervalMs < 50) {
      let frameId: number | null = null
      
      const loop = () => {
        setNow(Date.now())
        frameId = document.visibilityState === 'visible'
          ? window.requestAnimationFrame(loop)
          : null
      }

      const start = () => {
        if (frameId === null) {
          frameId = window.requestAnimationFrame(loop)
        }
      }

      const stop = () => {
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId)
          frameId = null
        }
      }

      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          start()
        } else {
          stop()
        }
      }
      
      start()
      document.addEventListener('visibilitychange', handleVisibilityChange)

      return () => {
        stop()
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
    }

    let timerId: number | null = null

    const start = () => {
      if (timerId !== null) {
        return
      }

      timerId = window.setInterval(() => {
        setNow(Date.now())
      }, intervalMs)
    }

    const stop = () => {
      if (timerId !== null) {
        window.clearInterval(timerId)
        timerId = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        start()
      } else {
        stop()
      }
    }

    start()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stop()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [intervalMs])

  return now
}
