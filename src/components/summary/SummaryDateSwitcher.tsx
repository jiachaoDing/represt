import { Link } from 'react-router-dom'

type SummaryDateSwitcherProps = {
  calendarTo: string
  canGoNext: boolean
  dateLabel: string
  onNext: () => void
  onPrevious: () => void
}

export function SummaryDateSwitcher({
  calendarTo,
  canGoNext,
  dateLabel,
  onNext,
  onPrevious,
}: SummaryDateSwitcherProps) {
  return (
    <section className="mx-4 mt-4 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrevious}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
          aria-label="上一天"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="text-[11px] text-[var(--on-surface-variant)]">训练日期</p>
          <p className="mt-1 truncate text-[15px] font-semibold text-[var(--on-surface)]">{dateLabel}</p>
        </div>

        <button
          type="button"
          disabled={!canGoNext}
          onClick={onNext}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)] disabled:opacity-30"
          aria-label="下一天"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        <Link
          to={calendarTo}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[var(--outline-variant)]/30 px-3 text-[13px] font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
        >
          日历
        </Link>
      </div>
    </section>
  )
}
