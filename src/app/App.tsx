import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { preloadPrimaryRouteModules, router } from './router'
import { initNotificationNavigation } from '../native/notification-navigation'

function App() {
  useEffect(() => {
    void import('../db/plans').then(({ ensurePlanSeedData }) => ensurePlanSeedData())
  }, [])

  useEffect(() => {
    void initNotificationNavigation(router)
  }, [])

  useEffect(() => {
    const preload = () => {
      preloadPrimaryRouteModules()
    }

    if (typeof window === 'undefined') {
      return
    }

    if ('requestIdleCallback' in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 1200 })
      return () => window.cancelIdleCallback(idleId)
    }

    const timeoutId = setTimeout(preload, 300)
    return () => clearTimeout(timeoutId)
  }, [])

  return <RouterProvider router={router} />
}

export default App
