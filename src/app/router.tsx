import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '../components/layout/AppLayout'
import { ExercisePageLoading } from '../components/exercise/ExercisePageLoading'
import { TrainingCyclePageLoading } from '../components/training-cycle/TrainingCyclePageLoading'
import {
  CalendarPage,
  ExercisePage,
  SchedulePage,
  SettingsPage,
  SummaryPage,
  TemplatesPage,
  TrainingCyclePage,
} from './route-components'
export { preloadPrimaryRouteModules } from './route-loaders'

function lazyRoute(element: ReactNode, fallback: ReactNode = null) {
  return <Suspense fallback={fallback}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: lazyRoute(<SchedulePage />),
        handle: { title: '训练安排' },
      },
      {
        path: 'exercise/:id',
        element: lazyRoute(<ExercisePage />, <ExercisePageLoading />),
        handle: { title: '动作页' },
      },
      {
        path: 'templates',
        element: lazyRoute(<TemplatesPage />),
        handle: { title: '模板编辑' },
      },
      {
        path: 'templates/cycle',
        element: lazyRoute(<TrainingCyclePage />, <TrainingCyclePageLoading />),
        handle: { title: '循环日程' },
      },
      {
        path: 'settings',
        element: lazyRoute(<SettingsPage />),
        handle: { title: '设置' },
      },
      {
        path: 'summary',
        element: lazyRoute(<SummaryPage />),
        handle: { title: '训练总结' },
      },
      {
        path: 'summary/:sessionId',
        element: lazyRoute(<SummaryPage />),
        handle: { title: '训练总结' },
      },
      {
        path: 'calendar',
        element: lazyRoute(<CalendarPage />),
        handle: { title: '训练日历' },
      },
    ],
  },
])
