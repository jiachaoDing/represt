import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'

import { router } from './router'

function App() {
  useEffect(() => {
    void import('../db/templates').then(({ ensureTemplateSeedData }) => ensureTemplateSeedData())
  }, [])

  return <RouterProvider router={router} />
}

export default App
