export const loadCalendarPage = () => import('../pages/CalendarPage')
export const loadExercisePage = () => import('../pages/ExercisePage')
export const loadQuickTimerPage = () => import('../pages/QuickTimerPage')
export const loadSchedulePage = () => import('../pages/SchedulePage')
export const loadSettingsPage = () => import('../pages/SettingsPage')
export const loadSummaryPage = () => import('../pages/SummaryPage')
export const loadStarterTemplatePage = () => import('../pages/StarterTemplatePage')
export const loadTrainingCyclePage = () => import('../pages/TrainingCyclePage')
export const loadTemplatesPage = () => import('../pages/TemplatesPage')

export function preloadPrimaryRouteModules() {
  void loadTemplatesPage()
  void loadSummaryPage()
}
