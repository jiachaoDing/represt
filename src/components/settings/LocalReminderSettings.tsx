import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getLocalReminderStatus,
  openExactAlarmSettings,
  openStrongReminderSettings,
  requestLocalReminderPermission,
  scheduleRestTimerTestNotification,
  type ExactAlarmPermission,
  type LocalReminderStatus,
} from '../../native/training-notifications'

type LocalReminderSettingsProps = {
  open: boolean
}

type BusyAction = 'permission' | 'exact' | 'app-settings' | 'test' | null

type T = ReturnType<typeof useTranslation>['t']

function getDisplayPermissionLabel(status: LocalReminderStatus | null, t: T) {
  if (!status?.isLocalNotificationsAvailable || status.displayPermission === 'unknown') {
    return t('settings.reminder.unavailable')
  }

  return status.isDisplayPermissionGranted ? t('settings.reminder.enabled') : t('settings.reminder.disabled')
}

function getExactAlarmLabel(permission: ExactAlarmPermission | null, t: T) {
  if (permission === 'granted') {
    return t('settings.reminder.enabled')
  }

  if (permission === 'denied') {
    return t('settings.reminder.disabled')
  }

  return t('settings.reminder.unavailable')
}

function getCapabilityLabel(value: boolean | null | undefined, t: T) {
  if (value === true) {
    return t('settings.reminder.available')
  }

  if (value === false) {
    return t('settings.reminder.notAvailable')
  }

  return t('settings.reminder.unavailable')
}

function getChannelLabel(status: LocalReminderStatus | null, t: T) {
  if (!status?.isStrongReminderChannelReady && !status?.isRestTimerChannelReady) {
    return t('settings.reminder.notConfigured')
  }

  if (
    status.restTimerChannelImportance !== null &&
    status.restTimerChannelImportance < 4
  ) {
    return t('settings.reminder.needsCheck')
  }

  if (status.restTimerChannelSound === null && status.strongReminderChannelSound === null) {
    return t('settings.reminder.needsCheck')
  }

  if (status.restTimerChannelVibration === false) {
    return t('settings.reminder.needsCheck')
  }

  return t('settings.reminder.configured')
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-[var(--on-surface-variant)]">{label}</span>
      <span className="rounded-full bg-[var(--surface-container)] px-2.5 py-1 text-xs font-medium text-[var(--on-surface)]">
        {value}
      </span>
    </div>
  )
}

function ActionButton({
  children,
  disabled,
  onClick,
  primary = false,
}: {
  children: string
  disabled?: boolean
  onClick: () => void
  primary?: boolean
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={[
        'flex min-h-10 items-center justify-center rounded-full px-3 py-2 text-xs font-semibold transition-opacity disabled:opacity-40',
        primary
          ? 'bg-[var(--primary)] text-[var(--on-primary)]'
          : 'border border-[var(--outline-variant)] text-[var(--on-surface)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function LocalReminderSettings({ open }: LocalReminderSettingsProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<LocalReminderStatus | null>(null)
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    const nextStatus = await getLocalReminderStatus()
    setStatus(nextStatus)
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      void refreshStatus()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [open, refreshStatus])

  async function runAction(action: Exclude<BusyAction, null>, task: () => Promise<void>) {
    try {
      setBusyAction(action)
      setNotice(null)
      await task()
    } catch (error) {
      console.warn(error)
      setNotice(t('settings.reminder.actionFailed'))
    } finally {
      setBusyAction(null)
      await refreshStatus()
    }
  }

  const isAvailable = Boolean(status?.isLocalNotificationsAvailable)
  const channelLabel = getChannelLabel(status, t)
  const exactAlarmLabel = getExactAlarmLabel(status?.exactAlarmPermission ?? null, t)
  const strongReminderLabel = getCapabilityLabel(status?.isStrongReminderAvailable, t)
  const fullScreenLabel = getCapabilityLabel(status?.strongReminderCanUseFullScreenIntent, t)

  return (
    <section className="rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-5 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--on-surface)]">{t('settings.reminder.title')}</p>
          <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
            {t('settings.reminder.description')}
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-[var(--outline-variant)] px-3 py-3">
          <StatusRow label={t('settings.reminder.displayPermission')} value={getDisplayPermissionLabel(status, t)} />
          <StatusRow label={t('settings.reminder.exactAlarm')} value={exactAlarmLabel} />
          <StatusRow label={t('settings.reminder.strongReminder')} value={strongReminderLabel} />
          <StatusRow label={t('settings.reminder.strongChannel')} value={channelLabel} />
          <StatusRow label={t('settings.reminder.fullScreen')} value={fullScreenLabel} />
        </div>

        <p className="text-xs leading-5 text-[var(--on-surface-variant)]">
          {t('settings.reminder.bannerHint')}
        </p>
        <p className="text-xs leading-5 text-[var(--on-surface-variant)]">
          {t('settings.reminder.android14Hint')}
        </p>

        {notice ? (
          <p className="rounded-xl bg-[var(--surface-container)] px-3 py-2 text-xs leading-5 text-[var(--on-surface-variant)]">
            {notice}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <ActionButton
            disabled={!isAvailable || busyAction !== null}
            onClick={() =>
              void runAction('permission', async () => {
                const permission = await requestLocalReminderPermission()
                setNotice(permission === 'granted' ? t('settings.reminder.permissionGranted') : t('settings.reminder.permissionDenied'))
              })
            }
            primary
          >
            {t('settings.reminder.requestPermission')}
          </ActionButton>
          <ActionButton
            disabled={!isAvailable || busyAction !== null}
            onClick={() =>
              void runAction('exact', async () => {
                const permission = await openExactAlarmSettings()
                setNotice(
                  permission === 'granted'
                    ? t('settings.reminder.exactGranted')
                    : t('settings.reminder.exactDenied'),
                )
              })
            }
          >
            {t('settings.reminder.openExactSettings')}
          </ActionButton>
          <ActionButton
            disabled={!status?.isStrongReminderAvailable || busyAction !== null}
            onClick={() =>
              void runAction('app-settings', async () => {
                const result = await openStrongReminderSettings()
                setNotice(result.message)
              })
            }
          >
            {t('settings.reminder.openStrongSettings')}
          </ActionButton>
          <ActionButton
            disabled={!isAvailable || busyAction !== null}
            onClick={() =>
              void runAction('test', async () => {
                const result = await scheduleRestTimerTestNotification()
                if (result.scheduled) {
                  setNotice(
                    result.exactAlarmPermission === 'denied'
                      ? t('settings.reminder.testScheduledExactDenied')
                      : t('settings.reminder.testScheduled'),
                  )
                  return
                }

                setNotice(
                  result.reason === 'permission-denied'
                    ? t('settings.reminder.testPermissionDenied')
                    : t('settings.reminder.testUnavailable'),
                )
              })
            }
          >
            {t('settings.reminder.sendTest')}
          </ActionButton>
        </div>
      </div>
    </section>
  )
}
