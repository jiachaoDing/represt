export const loadCalendarPage = () => import('../pages/CalendarPage')
export const loadExercisePage = () => import('../pages/ExercisePage')
export const loadExercisePickerPage = () => import('../pages/ExercisePickerPage')
export const loadExerciseRecordsPage = () => import('../pages/ExerciseRecordsPage')
export const loadQuickTimerPage = () => import('../pages/QuickTimerPage')
export const loadSchedulePage = () => import('../pages/SchedulePage')
export const loadSettingsPage = () => import('../pages/SettingsPage')
export const loadSummaryPage = () => import('../pages/SummaryPage')
export const loadTrainingCyclePage = () => import('../pages/TrainingCyclePage')
export const loadPlansPage = () => import('../pages/PlansPage')
export const loadPlanAiImportPage = () => import('../pages/PlanAiImportPage')

export function preloadPrimaryRouteModules() {
  void loadPlansPage()
  void loadSummaryPage()
}
