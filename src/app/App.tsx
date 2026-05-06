import { useEffect, useState } from 'react'
import { RouterProvider } from 'react-router-dom'

import { AppStartup } from '../components/layout/AppStartup'
import { preloadPrimaryRouteModules, router } from './router'

function App() {
  const [showStartup, setShowStartup] = useState(true)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setShowStartup(false), 760)
    return () => window.clearTimeout(timeoutId)
  }, [])

  useEffect(() => {
    void import('../native/notification-navigation').then(({ initNotificationNavigation }) =>
      initNotificationNavigation(router),
    )
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

  return (
    <>
      <RouterProvider router={router} />
      <AppStartup visible={showStartup} />
    </>
  )
}

export default App
