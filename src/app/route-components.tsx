import { lazy } from 'react'

import {
  loadCalendarPage,
  loadExercisePage,
  loadExercisePickerPage,
  loadExerciseRecordsPage,
  loadQuickTimerPage,
  loadSchedulePage,
  loadSettingsPage,
  loadSummaryPage,
  loadStarterPlanPage,
  loadPlansPage,
  loadPlanAiImportPage,
  loadTrainingCyclePage,
} from './route-loaders'

export const CalendarPage = lazy(() =>
  loadCalendarPage().then((module) => ({ default: module.CalendarPage })),
)
export const ExercisePage = lazy(() =>
  loadExercisePage().then((module) => ({ default: module.ExercisePage })),
)
export const ExercisePickerPage = lazy(() =>
  loadExercisePickerPage().then((module) => ({ default: module.ExercisePickerPage })),
)
export const ExerciseRecordsPage = lazy(() =>
  loadExerciseRecordsPage().then((module) => ({ default: module.ExerciseRecordsPage })),
)
export const QuickTimerPage = lazy(() =>
  loadQuickTimerPage().then((module) => ({ default: module.QuickTimerPage })),
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
export const StarterPlanPage = lazy(() =>
  loadStarterPlanPage().then((module) => ({ default: module.StarterPlanPage })),
)
export const TrainingCyclePage = lazy(() =>
  loadTrainingCyclePage().then((module) => ({ default: module.TrainingCyclePage })),
)
export const PlansPage = lazy(() =>
  loadPlansPage().then((module) => ({ default: module.PlansPage })),
)
export const PlanAiImportPage = lazy(() =>
  loadPlanAiImportPage().then((module) => ({ default: module.PlanAiImportPage })),
)
