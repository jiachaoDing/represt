import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { SummaryTrainingHeatmapData, SummaryTrainingHeatmapDay } from '../../db/sessions'
import { formatSessionDateKey, parseSessionDateKey } from '../../lib/session-date-key'

type SummaryTrainingHeatmapProps = {
  data: SummaryTrainingHeatmapData | null
  error: boolean
  isLoading: boolean
}

function buildMonthGroups(days: SummaryTrainingHeatmapDay[], locale: string) {
  const groups = new Map<string, SummaryTrainingHeatmapDay[]>()
  for (const day of days) {
    const month = day.dateKey.slice(0, 7)
    const group = groups.get(month) ?? []
    group.push(day)
    groups.set(month, group)
  }
  return [...groups.entries()].map(([key, monthDays]) => {
    const first = parseSessionDateKey(monthDays[0].dateKey)!
    const cells: Array<SummaryTrainingHeatmapDay | null> = Array.from(
      { length: (first.getDay() + 6) % 7 }, () => null,
    )
    cells.push(...monthDays)
    while (cells.length < 42) cells.push(null)
    return { key, cells, label: new Intl.DateTimeFormat(locale, { month: 'short' }).format(first) }
  })
}

export function SummaryTrainingHeatmap({ data, error, isLoading }: SummaryTrainingHeatmapProps) {
  const { t, i18n } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const months = useMemo(() => buildMonthGroups(data?.days ?? [], locale), [data, locale])

  if (error) return <p role="alert" className="m-4 text-sm text-[var(--error)]">{t('summary.heatmap.loadFailed')}</p>
  if (isLoading) return <p role="status" className="m-4 text-sm text-[var(--on-surface-variant)]">{t('growth.loading')}</p>
  if (!data) return null

  const rangeLabel = t('summary.heatmap.rangeLabel', {
    start: formatSessionDateKey(data.startDateKey, { month: 'short', year: 'numeric' }, locale),
    end: formatSessionDateKey(data.endDateKey, { month: 'short', year: 'numeric' }, locale),
  })
  const trainingDays = data.days.filter((day) => day.completedSets > 0).length

  return (
    <section className="mx-4 mt-4 text-[var(--on-surface)]">
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-[var(--on-surface-variant)]">{rangeLabel}</p>
        <p className="text-sm font-semibold">{t('growth.compact.trainingDays', { days: trainingDays })}</p>
      </div>
      <div className="grid grid-cols-3 gap-x-4 gap-y-5">
        {months.map((month) => (
          <div key={month.key}>
            <h2 className="mb-2 text-xs font-medium text-[var(--on-surface-variant)]">{month.label}</h2>
            <div className="grid grid-cols-7 gap-[3px]">
              {month.cells.map((day, index) => day ? (
                <span
                  key={day.dateKey}
                  className="aspect-square rounded-full"
                  style={{ backgroundColor: day.completedSets > 0
                    ? day.planColor ?? 'var(--on-surface-variant)' : 'var(--heatmap-level-0)' }}
                  role="img"
                  aria-label={t(day.completedSets > 0 ? 'growth.compact.trainingDayProgress' : 'summary.heatmap.emptyDayLabel', {
                    date: day.dateKey, percent: Math.round((day.completionRatio ?? 0) * 100),
                  })}
                />
              ) : <span key={`empty-${index}`} className="aspect-square" aria-hidden="true" />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
