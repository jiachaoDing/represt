import { lazy } from 'react'

import {
  loadCalendarPage,
  loadExercisePage,
  loadSchedulePage,
  loadSettingsPage,
  loadSummaryPage,
  loadStarterTemplatePage,
  loadTemplatesPage,
  loadTrainingCyclePage,
} from './route-loaders'

export const CalendarPage = lazy(() =>
  loadCalendarPage().then((module) => ({ default: module.CalendarPage })),
)
export const ExercisePage = lazy(() =>
  loadExercisePage().then((module) => ({ default: module.ExercisePage })),
)
export const SchedulePage = lazy(() =>
  loadSchedulePage().then((module) => ({ default: module.SchedulePage })),
)
export const SettingsPage = lazy(() =>
  loadSettingsPage().then((module) => ({ default: module.SettingsPage })),
)
export const SummaryPage = lazy(() =>
  loadSummaryPage().then((module) => ({ default: module.SummaryPage })),
)
export const StarterTemplatePage = lazy(() =>
  loadStarterTemplatePage().then((module) => ({ default: module.StarterTemplatePage })),
)
export const TrainingCyclePage = lazy(() =>
  loadTrainingCyclePage().then((module) => ({ default: module.TrainingCyclePage })),
)
export const TemplatesPage = lazy(() =>
  loadTemplatesPage().then((module) => ({ default: module.TemplatesPage })),
)
