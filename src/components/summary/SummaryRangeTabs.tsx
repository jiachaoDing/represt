import type { SummaryRange } from '../../db/sessions'

type SummaryRangeTabsProps = {
  activeRange: SummaryRange
  onChange: (range: SummaryRange) => void
  labels: Record<SummaryRange, string>
}

const ranges: SummaryRange[] = ['day', 'week', 'month']

export function SummaryRangeTabs({ activeRange, labels, onChange }: SummaryRangeTabsProps) {
  return (
    <div className="mx-4 mt-3 grid grid-cols-3 rounded-2xl bg-[var(--surface-container)] p-1">
      {ranges.map((range) => (
        <button
          key={range}
          type="button"
          onClick={() => onChange(range)}
          className={[
            'h-10 rounded-xl text-[14px] font-semibold transition-colors',
            activeRange === range
              ? 'bg-[var(--primary)] text-[var(--on-primary)]'
              : 'text-[var(--on-surface-variant)]',
          ].join(' ')}
        >
          {labels[range]}
        </button>
      ))}
    </div>
  )
}
