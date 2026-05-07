export const REMINDER_SETTINGS_PATH = '/settings/reminders'

const TIMER_REMINDER_SETTINGS_SEEN_KEY = 'trainre:timer-reminder-settings-seen'

export function hasSeenTimerReminderSettings() {
  if (typeof window === 'undefined') {
    return true
  }

  return window.localStorage.getItem(TIMER_REMINDER_SETTINGS_SEEN_KEY) === 'true'
}

export function markTimerReminderSettingsSeen() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(TIMER_REMINDER_SETTINGS_SEEN_KEY, 'true')
}
