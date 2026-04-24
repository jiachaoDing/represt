import { lazy, Suspense, type ReactNode } from 'react'
import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '../components/layout/AppLayout'

const loadCalendarPage = () => import('../pages/CalendarPage')
const loadExercisePage = () => import('../pages/ExercisePage')
const loadSchedulePage = () => import('../pages/SchedulePage')
const loadSummaryPage = () => import('../pages/SummaryPage')
const loadTrainingCyclePage = () => import('../pages/TrainingCyclePage')
const loadTemplatesPage = () => import('../pages/TemplatesPage')

const CalendarPage = lazy(() =>
  loadCalendarPage().then((module) => ({ default: module.CalendarPage })),
)
const ExercisePage = lazy(() =>
  loadExercisePage().then((module) => ({ default: module.ExercisePage })),
)
const SchedulePage = lazy(() =>
  loadSchedulePage().then((module) => ({ default: module.SchedulePage })),
)
const SummaryPage = lazy(() =>
  loadSummaryPage().then((module) => ({ default: module.SummaryPage })),
)
const TrainingCyclePage = lazy(() =>
  loadTrainingCyclePage().then((module) => ({ default: module.TrainingCyclePage })),
)
const TemplatesPage = lazy(() =>
  loadTemplatesPage().then((module) => ({ default: module.TemplatesPage })),
)

function lazyRoute(element: ReactNode) {
  return <Suspense fallback={null}>{element}</Suspense>
}

export function preloadPrimaryRouteModules() {
  void loadTemplatesPage()
  void loadSummaryPage()
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
        element: lazyRoute(<ExercisePage />),
        handle: { title: '动作页' },
      },
      {
        path: 'templates',
        element: lazyRoute(<TemplatesPage />),
        handle: { title: '模板编辑' },
      },
      {
        path: 'templates/cycle',
        element: lazyRoute(<TrainingCyclePage />),
        handle: { title: '循环日程' },
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
