export const loadCalendarPage = () => import('../pages/CalendarPage')
export const loadExercisePage = () => import('../pages/ExercisePage')
export const loadQuickTimerPage = () => import('../pages/QuickTimerPage')
export const loadSchedulePage = () => import('../pages/SchedulePage')
export const loadSettingsPage = () => import('../pages/SettingsPage')
export const loadSummaryPage = () => import('../pages/SummaryPage')
export const loadStarterPlanPage = () => import('../pages/StarterPlanPage')
export const loadTrainingCyclePage = () => import('../pages/TrainingCyclePage')
export const loadPlansPage = () => import('../pages/PlansPage')

export function preloadPrimaryRouteModules() {
  void loadPlansPage()
  void loadSummaryPage()
}
