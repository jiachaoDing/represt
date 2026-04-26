import { useCallback, useEffect, useState } from 'react'

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

function getDisplayPermissionLabel(status: LocalReminderStatus | null) {
  if (!status?.isLocalNotificationsAvailable || status.displayPermission === 'unknown') {
    return '无法检测'
  }

  return status.isDisplayPermissionGranted ? '已开启' : '未开启'
}

function getExactAlarmLabel(permission: ExactAlarmPermission | null) {
  if (permission === 'granted') {
    return '已开启'
  }

  if (permission === 'denied') {
    return '未开启'
  }

  return '无法检测'
}

function getCapabilityLabel(value: boolean | null | undefined) {
  if (value === true) {
    return '可用'
  }

  if (value === false) {
    return '不可用'
  }

  return '无法检测'
}

function getChannelLabel(status: LocalReminderStatus | null) {
  if (!status?.isStrongReminderChannelReady && !status?.isRestTimerChannelReady) {
    return '未配置'
  }

  if (
    status.restTimerChannelImportance !== null &&
    status.restTimerChannelImportance < 4
  ) {
    return '需检查'
  }

  if (status.restTimerChannelSound === null && status.strongReminderChannelSound === null) {
    return '需检查'
  }

  if (status.restTimerChannelVibration === false) {
    return '需检查'
  }

  return '已配置'
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
      setNotice('操作没有完成，请稍后重试。')
    } finally {
      setBusyAction(null)
      await refreshStatus()
    }
  }

  const isAvailable = Boolean(status?.isLocalNotificationsAvailable)
  const channelLabel = getChannelLabel(status)
  const exactAlarmLabel = getExactAlarmLabel(status?.exactAlarmPermission ?? null)
  const strongReminderLabel = getCapabilityLabel(status?.isStrongReminderAvailable)
  const fullScreenLabel = getCapabilityLabel(status?.strongReminderCanUseFullScreenIntent)

  return (
    <section className="rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-5 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-[var(--on-surface)]">训练提醒诊断</p>
          <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
            App 会尽量使用闹钟级本地提醒。顶部弹窗、锁屏显示、声音和准时程度仍受系统、勿扰、省电、锁屏通知、通知类别和厂商 ROM 控制。
          </p>
        </div>

        <div className="space-y-2 rounded-xl border border-[var(--outline-variant)] px-3 py-3">
          <StatusRow label="通知权限" value={getDisplayPermissionLabel(status)} />
          <StatusRow label="精确提醒" value={exactAlarmLabel} />
          <StatusRow label="强提醒方案" value={strongReminderLabel} />
          <StatusRow label="强提醒渠道" value={channelLabel} />
          <StatusRow label="全屏提醒能力" value={fullScreenLabel} />
        </div>

        <p className="text-xs leading-5 text-[var(--on-surface-variant)]">
          如不弹横幅，请打开强提醒类别设置，检查悬浮通知、声音、震动和锁屏显示，并将省电策略设为无限制。
        </p>
        <p className="text-xs leading-5 text-[var(--on-surface-variant)]">
          Android 14+ 会限制全屏提醒授权；未开放时仍会发送高重要性本地提醒。
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
                setNotice(permission === 'granted' ? '通知权限已开启。' : '通知权限未开启。')
              })
            }
            primary
          >
            请求通知权限
          </ActionButton>
          <ActionButton
            disabled={!isAvailable || busyAction !== null}
            onClick={() =>
              void runAction('exact', async () => {
                const permission = await openExactAlarmSettings()
                setNotice(
                  permission === 'granted'
                    ? '精确提醒已开启。'
                    : '精确提醒未开启，提醒可能延迟。',
                )
              })
            }
          >
            打开精确提醒设置
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
            打开强提醒设置
          </ActionButton>
          <ActionButton
            disabled={!isAvailable || busyAction !== null}
            onClick={() =>
              void runAction('test', async () => {
                const result = await scheduleRestTimerTestNotification()
                if (result.scheduled) {
                  setNotice(
                    result.exactAlarmPermission === 'denied'
                      ? '已安排 10 秒强提醒测试；精确提醒未开启时可能延迟。'
                      : '已安排 10 秒强提醒测试。',
                  )
                  return
                }

                setNotice(
                  result.reason === 'permission-denied'
                    ? '通知权限未开启，无法发送测试提醒。'
                    : '当前环境无法发送本地测试提醒。',
                )
              })
            }
          >
            发送 10 秒强提醒测试
          </ActionButton>
        </div>
      </div>
    </section>
  )
}
