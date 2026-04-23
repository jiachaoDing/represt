import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { ensureTemplateSeedData } from '../db/templates'
import { router } from './router'

function App() {
  useEffect(() => {
    void ensureTemplateSeedData()
  }, [])

  return <RouterProvider router={router} />
}

export default App
