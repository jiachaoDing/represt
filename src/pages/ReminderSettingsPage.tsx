import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

import { ReminderSettingsContent } from '../components/settings/LocalReminderSettings'
import { PageHeader } from '../components/ui/PageHeader'
import { markTimerReminderSettingsSeen } from '../lib/reminder-settings'

export function ReminderSettingsPage() {
  const { t } = useTranslation()

  useEffect(() => {
    markTimerReminderSettingsSeen()
  }, [])

  return (
    <div className="pb-4">
      <PageHeader
        title={t('settings.reminder.pageTitle')}
        subtitle={t('settings.reminder.pageSubtitle')}
        backFallbackTo="/settings"
      />

      <section className="mx-4 mt-4 overflow-hidden rounded-2xl border border-[var(--outline-variant)]/35 bg-[var(--surface)]">
        <ReminderSettingsContent />
      </section>
    </div>
  )
}
