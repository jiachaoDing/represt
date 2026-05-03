import { useCallback, useEffect, useState } from 'react'
import { Bell } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  getLocalReminderStatus,
  openBatteryOptimizationSettings,
  openExactAlarmSettings,
  openStrongReminderSettings,
  requestLocalReminderPermission,
  scheduleRestTimerTestNotification,
  type LocalReminderStatus,
} from '../../native/training-notifications'

type BusyAction = 'battery' | 'permission' | 'settings' | 'test' | null

type T = ReturnType<typeof useTranslation>['t']

function getReminderStatusLabel(status: LocalReminderStatus | null, t: T) {
  if (!status?.isLocalNotificationsAvailable || status.displayPermission === 'unknown') {
    return t('settings.reminder.systemLimited')
  }

  return status.isDisplayPermissionGranted ? t('settings.reminder.enabled') : t('settings.reminder.disabled')
}

function needsExactAlarmSettings(status: LocalReminderStatus | null) {
  return Boolean(
    status?.isDisplayPermissionGranted &&
      status.isStrongReminderAvailable &&
      (status.exactAlarmPermission === 'denied' ||
        status.strongReminderCanScheduleExactAlarms === false),
  )
}

function getExactAlarmStatusLabel(status: LocalReminderStatus | null, t: T) {
  if (
    status?.exactAlarmPermission === 'granted' ||
    status?.strongReminderCanScheduleExactAlarms === true
  ) {
    return t('settings.reminder.exactAlarmEnabled')
  }

  if (needsExactAlarmSettings(status)) {
    return t('settings.reminder.exactAlarmNeedsSetup')
  }

  return t('settings.reminder.systemLimited')
}

function getBatteryStatusLabel(status: LocalReminderStatus | null, t: T) {
  if (!status?.isNative || !status.isTimerForegroundServiceAvailable) {
    return t('settings.reminder.systemLimited')
  }

  if (status.isIgnoringBatteryOptimizations === true) {
    return t('settings.reminder.batteryAllowed')
  }

  return t('settings.reminder.batteryNeedsSetup')
}

function getPrimaryActionLabel(status: LocalReminderStatus | null, t: T) {
  if (needsExactAlarmSettings(status)) {
    return t('settings.reminder.openSystemSettings')
  }

  if (status?.isDisplayPermissionGranted) {
    return t('settings.reminder.checkSettings')
  }

  return t('settings.reminder.enable')
}

function ReminderActionButton({
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
        'min-h-10 whitespace-nowrap rounded-full px-4 py-2 text-[11px] leading-none font-semibold transition-opacity disabled:opacity-40',
        primary
          ? 'bg-[var(--primary)] text-[var(--on-primary)]'
          : 'border border-[var(--outline-variant)] text-[var(--on-surface)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export function LocalReminderSettings() {
  const { t } = useTranslation()
  const [status, setStatus] = useState<LocalReminderStatus | null>(null)
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refreshStatus = useCallback(async () => {
    const nextStatus = await getLocalReminderStatus()
    setStatus(nextStatus)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void refreshStatus()
    }, 0)

    function handleRefreshSignal() {
      if (document.visibilityState === 'visible') {
        void refreshStatus()
      }
    }

    document.addEventListener('visibilitychange', handleRefreshSignal)
    window.addEventListener('focus', handleRefreshSignal)

    return () => {
      window.clearTimeout(timeoutId)
      document.removeEventListener('visibilitychange', handleRefreshSignal)
      window.removeEventListener('focus', handleRefreshSignal)
    }
  }, [refreshStatus])

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
  const isGranted = Boolean(status?.isDisplayPermissionGranted)
  const shouldShowExactAlarmStatus = Boolean(status?.isNative && status.isStrongReminderAvailable)
  const shouldShowBatteryStatus = Boolean(status?.isNative && status.isTimerForegroundServiceAvailable)

  return (
    <div className="px-4 py-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--primary)]">
          <Bell size={19} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-sm font-medium text-[var(--on-surface)]">{t('settings.reminder.title')}</p>
            <span className="rounded-full bg-[var(--surface-container)] px-2.5 py-1 text-xs font-medium text-[var(--on-surface-variant)]">
              {getReminderStatusLabel(status, t)}
            </span>
          </div>
          <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
            {t('settings.reminder.description')}
          </p>
          {shouldShowExactAlarmStatus ? (
            <p className="mt-2 text-xs leading-5 text-[var(--on-surface-variant)]">
              <span className="font-medium text-[var(--on-surface)]">
                {t('settings.reminder.exactAlarmTitle')}
              </span>{' '}
              {getExactAlarmStatusLabel(status, t)}
            </p>
          ) : null}
          {shouldShowBatteryStatus ? (
            <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
              <span className="font-medium text-[var(--on-surface)]">
                {t('settings.reminder.batteryTitle')}
              </span>{' '}
              {getBatteryStatusLabel(status, t)}
            </p>
          ) : null}
          <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
            {t('settings.reminder.reliabilityHint')}
          </p>
        </div>
      </div>

      {notice ? (
        <p className="mt-3 rounded-xl bg-[var(--surface-container)] px-3 py-2 text-xs leading-5 text-[var(--on-surface-variant)]">
          {notice}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <ReminderActionButton
          disabled={!isAvailable || busyAction !== null}
          onClick={() =>
            void runAction(isGranted ? 'settings' : 'permission', async () => {
              if (isGranted) {
                if (needsExactAlarmSettings(status)) {
                  const exactPermission = await openExactAlarmSettings()
                  setNotice(
                    exactPermission === 'granted'
                      ? t('settings.reminder.exactAlarmGranted')
                      : t('settings.reminder.exactAlarmNeedsSettings'),
                  )
                  return
                }

                const result = await openStrongReminderSettings()
                setNotice(result.message)
                return
              }

              const permission = await requestLocalReminderPermission()
              setNotice(
                permission === 'granted'
                  ? t('settings.reminder.permissionGranted')
                  : t('settings.reminder.permissionDenied'),
              )
            })
          }
          primary
        >
          {getPrimaryActionLabel(status, t)}
        </ReminderActionButton>
        <ReminderActionButton
          disabled={!isAvailable || busyAction !== null}
          onClick={() =>
            void runAction('test', async () => {
              const result = await scheduleRestTimerTestNotification()
              if (result.scheduled) {
                setNotice(t('settings.reminder.testScheduled'))
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
        </ReminderActionButton>
        <ReminderActionButton
          disabled={!shouldShowBatteryStatus || busyAction !== null}
          onClick={() =>
            void runAction('battery', async () => {
              const result = await openBatteryOptimizationSettings()
              setNotice(result.message)
            })
          }
        >
          {t('settings.reminder.batterySettings')}
        </ReminderActionButton>
      </div>
    </div>
  )
}
