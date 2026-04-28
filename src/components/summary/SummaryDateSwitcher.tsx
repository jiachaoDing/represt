import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AnimatedContentSwap } from '../motion/AnimatedContentSwap'
import { useBackLinkState } from '../../hooks/useRouteBack'

type SummaryDateSwitcherProps = {
  calendarTo: string
  canGoNext: boolean
  dateLabels: {
    compact: string
    full: string
    short: string
  }
  onNext: () => void
  onPrevious: () => void
}

export function SummaryDateSwitcher({
  calendarTo,
  canGoNext,
  dateLabels,
  onNext,
  onPrevious,
}: SummaryDateSwitcherProps) {
  const { t } = useTranslation()
  const backLinkState = useBackLinkState()

  return (
    <section className="mx-4 mt-2 overflow-hidden rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="grid grid-cols-[5.5rem_minmax(0,1fr)_5.5rem] items-center gap-2">
        <div className="flex justify-start">
          <button
            type="button"
            onClick={onPrevious}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
            aria-label={t('summary.previousDay')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        <div className="min-w-0 overflow-hidden text-center">
          <p className="truncate text-[10px] min-[390px]:text-[11px] text-[var(--on-surface-variant)]">
            {t('summary.dateLabel')}
          </p>
          <p
            className="mt-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[14px] font-semibold text-[var(--on-surface)] min-[390px]:text-[15px]"
            aria-label={dateLabels.full}
          >
            <AnimatedContentSwap
              contentKey={dateLabels.full}
              className="block w-full min-w-0 overflow-hidden [&>span]:w-full [&>span]:min-w-0"
            >
              <span className="hidden w-full min-w-0 truncate min-[430px]:block">{dateLabels.full}</span>
              <span className="hidden w-full min-w-0 truncate max-[429px]:block max-[359px]:hidden">
                {dateLabels.short}
              </span>
              <span className="hidden w-full min-w-0 truncate max-[359px]:block">{dateLabels.compact}</span>
            </AnimatedContentSwap>
          </p>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            to={calendarTo}
            state={backLinkState}
            viewTransition
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)]"
            aria-label={t('summary.calendar')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </Link>

          <button
            type="button"
            disabled={!canGoNext}
            onClick={onNext}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)] disabled:opacity-30"
            aria-label={t('summary.nextDay')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
    </section>
  )
}
