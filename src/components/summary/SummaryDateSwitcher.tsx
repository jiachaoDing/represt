import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AnimatedContentSwap } from '../motion/AnimatedContentSwap'
import { useBackLinkState } from '../../hooks/useRouteBack'

type SummaryDateSwitcherProps = {
  calendarTo: string
  dateLabels: {
    compact: string
    full: string
    short: string
  }
}

export function SummaryDateSwitcher({
  calendarTo,
  dateLabels,
}: SummaryDateSwitcherProps) {
  const { t } = useTranslation()
  const backLinkState = useBackLinkState()

  return (
    <section className="mx-4 mt-2 px-1 py-1">
      <div className="relative min-h-11">
        <div className="mx-auto flex min-h-11 max-w-[15rem] min-w-0 items-center justify-center overflow-hidden px-12 text-center">
          <p
            className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[16px] font-semibold text-[var(--on-surface)]"
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

        <div className="absolute right-0 top-1/2 -translate-y-1/2">
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
        </div>
      </div>
    </section>
  )
}
