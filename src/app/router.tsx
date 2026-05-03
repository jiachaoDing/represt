import { Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '../components/layout/AppLayout'
import { ExercisePageLoading } from '../components/exercise/ExercisePageLoading'
import { TrainingCyclePageLoading } from '../components/training-cycle/TrainingCyclePageLoading'
import {
  CalendarPage,
  ExercisePage,
  QuickTimerPage,
  SchedulePage,
  SettingsPage,
  StarterPlanPage,
  SummaryPage,
  PlanAiImportPage,
  PlansPage,
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
        handle: { titleKey: 'routes.schedule' },
      },
      {
        path: 'exercise/:id',
        element: lazyRoute(<ExercisePage />, <ExercisePageLoading />),
        handle: { titleKey: 'routes.exercise' },
      },
      {
        path: 'quick-timer',
        element: lazyRoute(<QuickTimerPage />),
        handle: { titleKey: 'routes.quickTimer' },
      },
      {
        path: 'plans',
        element: lazyRoute(<PlansPage />),
        handle: { titleKey: 'routes.plans' },
      },
      {
        path: 'plans/starter',
        element: lazyRoute(<StarterPlanPage />),
        handle: { titleKey: 'routes.starterPlan' },
      },
      {
        path: 'plans/ai-import',
        element: lazyRoute(<PlanAiImportPage />),
        handle: { titleKey: 'routes.planAiImport' },
      },
      {
        path: 'plans/cycle',
        element: lazyRoute(<TrainingCyclePage />, <TrainingCyclePageLoading />),
        handle: { titleKey: 'routes.trainingCycle' },
      },
      {
        path: 'settings',
        element: lazyRoute(<SettingsPage />),
        handle: { titleKey: 'routes.settings' },
      },
      {
        path: 'summary',
        element: lazyRoute(<SummaryPage />),
        handle: { titleKey: 'routes.summary' },
      },
      {
        path: 'summary/:sessionId',
        element: lazyRoute(<SummaryPage />),
        handle: { titleKey: 'routes.summary' },
      },
      {
        path: 'calendar',
        element: lazyRoute(<CalendarPage />),
        handle: { titleKey: 'routes.calendar' },
      },
    ],
  },
])
