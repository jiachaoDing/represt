import { Timer } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { useQuickTimer } from '../../hooks/useQuickTimer'

const quickTimerTipStorageKey = 'trainre.quickTimerTipDismissed.v1'

type QuickTimerEntryButtonProps = {
  active?: boolean
  now: number
  onClick: () => void
}

function getStoredQuickTimerTipDismissed() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(quickTimerTipStorageKey) === 'true'
}

export function QuickTimerEntryButton({ active = false, now, onClick }: QuickTimerEntryButtonProps) {
  const { t } = useTranslation()
  const quickTimer = useQuickTimer()
  const [isQuickTimerTipDismissed, setIsQuickTimerTipDismissed] = useState(
    getStoredQuickTimerTipDismissed,
  )
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
  const shouldShowQuickTimerTip = !active && !hint && !isQuickTimerTipDismissed

  function handleClick() {
    window.localStorage.setItem(quickTimerTipStorageKey, 'true')
    setIsQuickTimerTipDismissed(true)
    quickTimer.acknowledgeFinish()
    onClick()
  }

  return (
    <div className="relative overflow-visible">
      <button
        type="button"
        aria-label={t(active ? 'exercise.closeQuickTimer' : 'exercise.openQuickTimer')}
        aria-pressed={active}
        onClick={handleClick}
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

      {shouldShowQuickTimerTip ? (
        <button
          type="button"
          onClick={handleClick}
          className="absolute left-1/2 top-11 z-50 inline-flex min-h-8 w-max -translate-x-1/2 items-center gap-1.5 rounded-full border border-[var(--outline-variant)]/10 bg-transparent px-3 text-[12px] font-semibold leading-none text-[var(--on-surface-variant)] shadow-none backdrop-blur-sm tap-highlight-transparent"
        >
          <Timer size={14} strokeWidth={2} aria-hidden="true" />
          {t('exercise.quickTimerTitle')}
        </button>
      ) : null}
    </div>
  )
}
