import { Link } from 'react-router-dom'

import type { CalendarDateCell } from '../../lib/session-date-key'

type CalendarMonthGridProps = {
  cells: CalendarDateCell[]
  selectedDateKey: string
  sessionDateKeySet: Set<string>
}

const weekLabels = ['日', '一', '二', '三', '四', '五', '六']

export function CalendarMonthGrid({
  cells,
  selectedDateKey,
  sessionDateKeySet,
}: CalendarMonthGridProps) {
  return (
    <section className="mx-4 mt-4 rounded-[1.5rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="mb-3 grid grid-cols-7 gap-2">
        {weekLabels.map((label) => (
          <div
            key={label}
            className="flex h-8 items-center justify-center text-[11px] font-medium text-[var(--on-surface-variant)]"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell) => {
          const hasSession = sessionDateKeySet.has(cell.dateKey)
          const isSelected = cell.dateKey === selectedDateKey
          const cellClassName = [
            'flex aspect-square min-h-11 items-center justify-center rounded-2xl border text-[14px] font-medium transition-colors',
            cell.isCurrentMonth
              ? 'border-[var(--outline-variant)]/10 text-[var(--on-surface)]'
              : 'border-transparent text-[var(--outline)]/70',
            hasSession ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]' : 'bg-[var(--surface-container)]/50',
            isSelected ? 'ring-2 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--surface)]' : '',
          ].join(' ')
          const cellContent = (
            <div className="flex flex-col items-center gap-1">
              <span>{cell.dayNumber}</span>
              <span
                className={[
                  'h-1.5 w-1.5 rounded-full',
                  hasSession ? 'bg-[var(--primary)]' : 'bg-transparent',
                ].join(' ')}
              />
            </div>
          )

          if (!hasSession) {
            return (
              <div
                key={cell.dateKey}
                className={cellClassName}
                aria-label={`${cell.dateKey} 无训练记录`}
              >
                {cellContent}
              </div>
            )
          }

          return (
            <Link
              key={cell.dateKey}
              to={`/summary?date=${cell.dateKey}`}
              className={cellClassName}
              aria-label={`${cell.dateKey} 有训练记录`}
            >
              {cellContent}
            </Link>
          )
        })}
      </div>
    </section>
  )
}
