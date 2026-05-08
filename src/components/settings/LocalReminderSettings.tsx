import { useCallback, useEffect, useState } from 'react'
import { AlarmClock, Battery, Bell, ChevronRight, LockKeyhole, type LucideIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  getTrainingTimerBeepVolume,
  getLocalReminderStatus,
  getRepeatFinishAlertInBackground,
  openAppNotificationSettings,
  openBatteryOptimizationSettings,
  openExactAlarmSettings,
  openTimerChannelSettings,
  requestLocalReminderPermission,
  setRepeatFinishAlertInBackground,
  setTrainingTimerBeepVolume,
  type LocalReminderStatus,
} from '../../native/training-notifications'

type BusyAction = 'battery' | 'exactAlarm' | 'permission' | 'settings' | 'timerChannel' | null

type T = ReturnType<typeof useTranslation>['t']

function getPrimaryActionLabel(status: LocalReminderStatus | null, t: T) {
  if (status?.isDisplayPermissionGranted) {
    return t('settings.reminder.checkSettings')
  }

  return t('settings.reminder.enable')
}

function getStepStatusLabel(isDone: boolean, isAvailable: boolean, t: T) {
  if (!isAvailable) {
    return t('settings.reminder.unavailableStatus')
  }

  return isDone ? t('settings.reminder.doneStatus') : t('settings.reminder.pendingStatus')
}

function getReminderEntryStatusLabel(status: LocalReminderStatus | null, t: T) {
  if (!status?.isNotificationPermissionAvailable || status.displayPermission === 'unknown') {
    return t('settings.reminder.systemLimited')
  }

  if (!status.isDisplayPermissionGranted) {
    return t('settings.reminder.needsSetup')
  }

  if (status.isNative && status.isTimerForegroundServiceAvailable) {
    if (status.isExactAlarmPermissionGranted === false || status.isIgnoringBatteryOptimizations === false) {
      return t('settings.reminder.needsSetup')
    }
  }

  return t('settings.reminder.enabled')
}

function ReminderPermissionRow({
  actionLabel,
  disabled,
  icon: Icon,
  onClick,
  path,
  supporting,
  statusLabel,
  title,
}: {
  actionLabel: string
  disabled?: boolean
  icon: LucideIcon
  onClick: () => void
  path: string
  supporting?: string
  statusLabel: string
  title: string
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[var(--surface-container)] disabled:opacity-60"
    >
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container-high)] text-[var(--primary)]">
        <Icon size={18} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="text-sm font-semibold text-[var(--on-surface)]">{title}</span>
          <span className="shrink-0 rounded-full bg-[var(--surface-container)] px-2.5 py-1 text-xs font-medium text-[var(--on-surface-variant)]">
            {statusLabel}
          </span>
        </span>
        {supporting ? (
          <span className="mt-1 block text-xs leading-5 text-[var(--on-surface-variant)]">
            {supporting}
          </span>
        ) : null}
        <span className="mt-1.5 block text-xs leading-5 text-[var(--on-surface-variant)]">{path}</span>
        <span className="mt-2 inline-flex min-h-7 items-center gap-1 text-xs font-semibold text-[var(--primary)]">
          {actionLabel}
          <ChevronRight size={14} strokeWidth={2.2} aria-hidden="true" />
        </span>
      </span>
    </button>
  )
}

function useLocalReminderStatus() {
  const [status, setStatus] = useState<LocalReminderStatus | null>(null)

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

  return { refreshStatus, status }
}

export function ReminderSettingsContent() {
  const { t } = useTranslation()
  const { refreshStatus, status } = useLocalReminderStatus()
  const [busyAction, setBusyAction] = useState<BusyAction>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [beepVolume, setBeepVolume] = useState(() => getTrainingTimerBeepVolume())
  const [repeatFinishAlert, setRepeatFinishAlert] = useState(() => getRepeatFinishAlertInBackground())

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

  function updateBeepVolume(nextVolume: number) {
    setBeepVolume(nextVolume)
    setTrainingTimerBeepVolume(nextVolume)
  }

  function updateRepeatFinishAlert(enabled: boolean) {
    setRepeatFinishAlert(enabled)
    setRepeatFinishAlertInBackground(enabled)
  }

  const isAvailable = Boolean(status?.isNotificationPermissionAvailable)
  const isGranted = Boolean(status?.isDisplayPermissionGranted)
  const shouldShowBatteryStatus = Boolean(status?.isNative && status.isTimerForegroundServiceAvailable)
  const shouldShowExactAlarmStatus = shouldShowBatteryStatus && status?.isExactAlarmPermissionGranted !== null
  const shouldShowTimerChannelStatus = Boolean(status?.isNative && status.isTimerForegroundServiceAvailable)
  const isBatteryAllowed = status?.isIgnoringBatteryOptimizations === true
  const isExactAlarmAllowed = status?.isExactAlarmPermissionGranted === true
  const canOpenBatterySettings = shouldShowBatteryStatus && isExactAlarmAllowed

  return (
    <div className="px-4 py-4">
      <div>
        <p className="text-base font-semibold text-[var(--on-surface)]">
          {t('settings.reminder.permissionChecklistTitle')}
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--on-surface-variant)]">
          {t('settings.reminder.permissionChecklistDescription')}
        </p>
        <p className="mt-3 text-xs leading-5 text-[var(--on-surface-variant)]">
          {t('settings.reminder.systemSettingsNote')}
        </p>
      </div>

      {notice ? (
        <p className="mt-3 rounded-xl bg-[var(--surface-container)] px-3 py-2 text-xs leading-5 text-[var(--on-surface-variant)]">
          {notice}
        </p>
      ) : null}

      <div className="mt-5">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-normal text-[var(--on-surface-variant)]">
          {t('settings.reminder.requiredPermissionsTitle')}
        </p>
        <div className="-mx-4 border-y border-[var(--outline-variant)]/35">
        <ReminderPermissionRow
          actionLabel={getPrimaryActionLabel(status, t)}
          disabled={!isAvailable || busyAction !== null}
          icon={Bell}
          onClick={() =>
            void runAction(isGranted ? 'settings' : 'permission', async () => {
              if (isGranted) {
                const result = await openAppNotificationSettings()
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
          path={t('settings.reminder.notificationPath')}
          statusLabel={getStepStatusLabel(isGranted, isAvailable, t)}
          title={t('settings.reminder.notificationTitle')}
        />
        <div className="ml-16 border-t border-[var(--outline-variant)]/35" />
        <ReminderPermissionRow
          actionLabel={t('settings.reminder.exactAlarmSettings')}
          disabled={!shouldShowExactAlarmStatus || busyAction !== null}
          icon={AlarmClock}
          onClick={() =>
            void runAction('exactAlarm', async () => {
              const result = await openExactAlarmSettings()
              setNotice(result.message)
            })
          }
          path={t('settings.reminder.exactAlarmPath')}
          statusLabel={getStepStatusLabel(isExactAlarmAllowed, shouldShowExactAlarmStatus, t)}
          title={t('settings.reminder.exactAlarmChecklistTitle')}
        />
        <div className="ml-16 border-t border-[var(--outline-variant)]/35" />
        <ReminderPermissionRow
          actionLabel={
            isExactAlarmAllowed
              ? t('settings.reminder.batterySettings')
              : t('settings.reminder.completeExactAlarmFirst')
          }
          disabled={!canOpenBatterySettings || busyAction !== null}
          icon={Battery}
          onClick={() =>
            void runAction('battery', async () => {
              const result = await openBatteryOptimizationSettings()
              setNotice(result.message)
            })
          }
          path={t('settings.reminder.batteryPath')}
          supporting={t('settings.reminder.batteryDescription')}
          statusLabel={getStepStatusLabel(isBatteryAllowed, shouldShowBatteryStatus, t)}
          title={t('settings.reminder.batteryChecklistTitle')}
        />
        </div>
      </div>

      <div className="mt-5">
        <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-normal text-[var(--on-surface-variant)]">
          {t('settings.reminder.optionalPermissionsTitle')}
        </p>
        <div className="-mx-4 border-y border-[var(--outline-variant)]/35">
        <ReminderPermissionRow
          actionLabel={t('settings.reminder.timerChannelSettings')}
          disabled={!shouldShowTimerChannelStatus || busyAction !== null}
          icon={LockKeyhole}
          onClick={() =>
            void runAction('timerChannel', async () => {
              const result = await openTimerChannelSettings()
              setNotice(result.message)
            })
          }
          path={t('settings.reminder.timerChannelPath')}
          supporting={t('settings.reminder.timerChannelDescription')}
          statusLabel={t('settings.reminder.optionalStatus')}
          title={t('settings.reminder.timerChannelChecklistTitle')}
        />
        </div>
      </div>

      {shouldShowBatteryStatus ? (
        <div className="mt-5">
          <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-normal text-[var(--on-surface-variant)]">
            {t('settings.reminder.timerBehaviorTitle')}
          </p>
          <div className="space-y-3">
          <label className="flex items-start justify-between gap-4 rounded-2xl bg-[var(--surface-container)] px-4 py-4">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-[var(--on-surface)]">
                {t('settings.reminder.repeatFinishAlertTitle')}
              </span>
              <span className="mt-1 block text-xs leading-5 text-[var(--on-surface-variant)]">
                {t('settings.reminder.repeatFinishAlertDescription')}
              </span>
            </span>
            <input
              type="checkbox"
              checked={repeatFinishAlert}
              onChange={(event) => updateRepeatFinishAlert(event.currentTarget.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[var(--primary)]"
              aria-label={t('settings.reminder.repeatFinishAlertTitle')}
            />
          </label>

          <div className="rounded-2xl bg-[var(--surface-container)] px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="training-timer-beep-volume"
                className="text-sm font-semibold text-[var(--on-surface)]"
              >
                {t('settings.reminder.serviceSoundVolumeTitle')}
              </label>
              <span className="text-xs font-medium text-[var(--on-surface-variant)]">
                {t('settings.reminder.serviceSoundVolumeValue', {
                  value: Math.round(beepVolume * 100),
                })}
              </span>
            </div>
            <input
              id="training-timer-beep-volume"
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(beepVolume * 100)}
              aria-label={t('settings.reminder.serviceSoundVolumeTitle')}
              onChange={(event) => updateBeepVolume(Number(event.currentTarget.value) / 100)}
              className="mt-3 w-full accent-[var(--primary)]"
            />
            <p className="mt-2 text-xs leading-5 text-[var(--on-surface-variant)]">
              {t('settings.reminder.serviceSoundVolumeDescription')}
            </p>
          </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function ReminderSettingsEntry({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
  const { status } = useLocalReminderStatus()

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-container)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--primary)]">
        <Bell size={19} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--on-surface)]">
          {t('settings.reminder.entryTitle')}
        </span>
        <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
          {t('settings.reminder.entryDescription')}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--on-surface-variant)]">
        <span className="max-w-20 truncate">{getReminderEntryStatusLabel(status, t)}</span>
        <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
      </span>
    </button>
  )
}

export function LocalReminderSettings() {
  return <ReminderSettingsContent />
}
