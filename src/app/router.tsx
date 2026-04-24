import { createBrowserRouter } from 'react-router-dom'

import { AppLayout } from '../components/layout/AppLayout'
import { CalendarPage } from '../pages/CalendarPage'
import { ExercisePage } from '../pages/ExercisePage'
import { SchedulePage } from '../pages/SchedulePage'
import { SummaryPage } from '../pages/SummaryPage'
import { TrainingCyclePage } from '../pages/TrainingCyclePage'
import { TemplatesPage } from '../pages/TemplatesPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <SchedulePage />,
        handle: { title: '训练安排' },
      },
      {
        path: 'exercise/:id',
        element: <ExercisePage />,
        handle: { title: '动作页' },
      },
      {
        path: 'templates',
        element: <TemplatesPage />,
        handle: { title: '模板编辑' },
      },
      {
        path: 'templates/cycle',
        element: <TrainingCyclePage />,
        handle: { title: '循环日程' },
      },
      {
        path: 'summary',
        element: <SummaryPage />,
        handle: { title: '训练总结' },
      },
      {
        path: 'summary/:sessionId',
        element: <SummaryPage />,
        handle: { title: '训练总结' },
      },
      {
        path: 'calendar',
        element: <CalendarPage />,
        handle: { title: '训练日历' },
      },
    ],
  },
])
