import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useBackLinkState } from '../../hooks/useRouteBack'
import { addDaysToSessionDateKey, formatSessionDateKey, parseSessionDateKey } from '../../lib/session-date-key'

type TrainingHabitOverviewProps = {
  trainingDays: string[]
  dayColors: ReadonlyMap<string, string>
  today: string
}

export function TrainingHabitOverview({ trainingDays, dayColors, today }: TrainingHabitOverviewProps) {
  const { t, i18n } = useTranslation()
  const backLinkState = useBackLinkState()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeDays = useMemo(() => new Set(trainingDays), [trainingDays])
  const weekday = parseSessionDateKey(today)!.getDay()
  const start = addDaysToSessionDateKey(today, -((weekday + 6) % 7) - 51 * 7)
  const weeks = Array.from({ length: 52 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDaysToSessionDateKey(start, week * 7 + day)))
  const formatDate = (date: string) => formatSessionDateKey(date, { month: 'short', year: 'numeric' }, i18n.resolvedLanguage)

  useEffect(() => {
    const element = scrollRef.current
    if (element) element.scrollLeft = element.scrollWidth
  }, [today])

  return (
    <Link
      to="/summary/heatmap"
      state={backLinkState}
      className="block rounded-3xl bg-[var(--surface-container)] p-4 active:opacity-80"
      aria-label={t('summary.heatmap.openFullYear')}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{t('growth.consistency')}</h2>
        <ChevronRight size={16} className="text-[var(--on-surface-variant)]" aria-hidden="true" />
      </div>
      <div className="mt-3 flex gap-2" data-primary-tab-swipe-lock="true">
        <div className="relative mt-5 w-3 shrink-0 text-[9px] leading-none text-[var(--on-surface-variant)]" aria-hidden="true">
          {[0, 3, 6].map((day, index) => (
            <span key={day} className={['absolute left-0 top-0', 'absolute left-0 top-1/2 -translate-y-1/2', 'absolute bottom-0 left-0'][index]}>
              {new Intl.DateTimeFormat(i18n.resolvedLanguage, { weekday: 'narrow' }).format(new Date(2024, 0, day + 1))}
            </span>
          ))}
        </div>
        <div ref={scrollRef} className="scrollbar-hide min-w-0 flex-1 overflow-x-auto overscroll-x-contain">
          <div
            className="grid gap-[3px]"
            style={{ gridTemplateColumns: 'repeat(52, calc((100% - 51px) / 18))' }}
            role="img"
            aria-label={t('growth.compact.habitMap', { start: formatDate(start), end: formatDate(today) })}
          >
            {weeks.map((week, index) => {
              const showMonth = index === 0 || week[0].slice(0, 7) !== weeks[index - 1][0].slice(0, 7)
              return (
                <div key={week[0]} className="min-w-0">
                  <p className="h-5 whitespace-nowrap text-[10px] text-[var(--on-surface-variant)]" aria-hidden="true">
                    {showMonth ? formatSessionDateKey(week[0], { month: 'short' }, i18n.resolvedLanguage) : null}
                  </p>
                  <div className="grid grid-rows-7 gap-[3px]">
                    {week.map((date) => (
                      <span key={date} aria-hidden="true" title={date} className="aspect-square rounded-full"
                        style={{ backgroundColor: date > today ? 'transparent' : activeDays.has(date)
                          ? dayColors.get(date) ?? 'var(--on-surface-variant)' : 'var(--heatmap-level-0)' }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Link>
  )
}
