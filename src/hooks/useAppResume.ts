import { useEffect, useRef } from 'react'
import { App as CapacitorApp } from '@capacitor/app'
import type { PluginListenerHandle } from '@capacitor/core'

import { isNativeApp } from '../native/capacitor-platform'

export function useAppResume(onResume: () => void) {
  const onResumeRef = useRef(onResume)
  const lastResumeAtRef = useRef(0)

  useEffect(() => {
    onResumeRef.current = onResume
  }, [onResume])

  useEffect(() => {
    function emitResume() {
      const now = Date.now()
      if (now - lastResumeAtRef.current < 300) {
        return
      }

      lastResumeAtRef.current = now
      onResumeRef.current()
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        emitResume()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    let listener: PluginListenerHandle | null = null
    let isDisposed = false

    if (isNativeApp()) {
      void CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          emitResume()
        }
      }).then((handle) => {
        if (isDisposed) {
          void handle.remove()
          return
        }

        listener = handle
      })
    }

    return () => {
      isDisposed = true
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      void listener?.remove()
    }
  }, [])
}
