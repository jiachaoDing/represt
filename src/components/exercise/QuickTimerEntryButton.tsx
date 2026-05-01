import { Timer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useQuickTimer } from '../../hooks/useQuickTimer'

type QuickTimerEntryButtonProps = {
  active?: boolean
  now: number
  onClick: () => void
}

export function QuickTimerEntryButton({ active = false, now, onClick }: QuickTimerEntryButtonProps) {
  const { t } = useTranslation()
  const quickTimer = useQuickTimer()
  const remainingMs =
    quickTimer.state.status === 'running' && quickTimer.state.endsAt
      ? Math.max(0, quickTimer.state.endsAt - now)
      : quickTimer.state.remainingMs
  const remainingSeconds = Math.ceil(remainingMs / 1000)
  const isElapsed =
    quickTimer.state.status === 'finished' ||
    (quickTimer.state.status === 'running' &&
      quickTimer.state.endsAt !== null &&
      quickTimer.state.endsAt <= now)
  const hint = isElapsed && !quickTimer.state.isFinishAcknowledged
    ? t('exercise.quickTimerFinishedPrompt')
    : quickTimer.state.status === 'running'
    ? t('exercise.quickTimerRemainingSeconds', { seconds: remainingSeconds })
    : quickTimer.state.status === 'paused'
    ? t('exercise.quickTimerPausedSeconds', { seconds: remainingSeconds })
    : null

  return (
    <button
      type="button"
      aria-label={t(active ? 'exercise.closeQuickTimer' : 'exercise.openQuickTimer')}
      aria-pressed={active}
      onClick={() => {
        quickTimer.acknowledgeFinish()
        onClick()
      }}
      className={[
        'flex h-10 items-center rounded-full transition-colors tap-highlight-transparent',
        hint ? 'gap-1.5 pl-2 pr-3' : 'w-10 justify-center',
        active
          ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
          : 'text-[var(--on-surface-variant)] hover:bg-[var(--on-surface-variant)]/10 hover:text-[var(--on-surface)]',
      ].join(' ')}
    >
      {hint ? (
        <span className="max-w-20 truncate text-[12px] font-medium leading-none">
          {hint}
        </span>
      ) : null}
      <Timer size={23} strokeWidth={2.3} aria-hidden="true" />
    </button>
  )
}
