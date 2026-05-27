import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Maximize2 } from 'lucide-react'
import { Link } from 'react-router-dom'

import type {
  SummaryTrainingHeatmapData,
  SummaryTrainingHeatmapDay,
} from '../../db/sessions'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import { formatSetRecordValue } from '../../lib/set-record-measurement'
import { formatSessionDateKey, parseSessionDateKey } from '../../lib/session-date-key'

type SummaryTrainingHeatmapProps = {
  data: SummaryTrainingHeatmapData | null
  detailTo?: string
  error: boolean
  isLoading: boolean
  variant?: 'card' | 'page'
}

type HeatmapCell = SummaryTrainingHeatmapDay | null
type SelectedHeatmapDate = {
  dateKey: string
  rangeKey: string
}
type HeatmapMonth = {
  cells: HeatmapCell[]
  key: string
  label: string
}

function getHeatmapLevel(completedSets: number) {
  if (completedSets >= 12) {
    return 4
  }
  if (completedSets >= 8) {
    return 3
  }
  if (completedSets >= 4) {
    return 2
  }
  if (completedSets >= 1) {
    return 1
  }

  return 0
}

function buildWeekColumns(days: SummaryTrainingHeatmapDay[]) {
  const cells: HeatmapCell[] = []
  const firstDate = parseSessionDateKey(days[0]?.dateKey)
  const leadingEmptyCount = firstDate ? (firstDate.getDay() + 6) % 7 : 0

  for (let index = 0; index < leadingEmptyCount; index += 1) {
    cells.push(null)
  }

  cells.push(...days)

  while (cells.length % 7 !== 0) {
    cells.push(null)
  }

  const columns: HeatmapCell[][] = []
  for (let index = 0; index < cells.length; index += 7) {
    columns.push(cells.slice(index, index + 7))
  }

  return columns
}

function buildMonthGroups(days: SummaryTrainingHeatmapDay[], locale: string) {
  const groups = new Map<string, SummaryTrainingHeatmapDay[]>()

  for (const day of days) {
    const monthKey = day.dateKey.slice(0, 7)
    const current = groups.get(monthKey) ?? []
    current.push(day)
    groups.set(monthKey, current)
  }

  return Array.from(groups.entries()).map(([key, monthDays]) => {
    const firstDate = parseSessionDateKey(monthDays[0]?.dateKey)
    const leadingEmptyCount = firstDate ? (firstDate.getDay() + 6) % 7 : 0
    const cells: HeatmapCell[] = []

    for (let index = 0; index < leadingEmptyCount; index += 1) {
      cells.push(null)
    }

    cells.push(...monthDays)

    while (cells.length < 42) {
      cells.push(null)
    }

    return {
      cells,
      key,
      label: firstDate
        ? new Intl.DateTimeFormat(locale, { month: 'short' }).format(firstDate)
        : key,
    } satisfies HeatmapMonth
  })
}

function formatTime(completedAt: string, locale = 'zh-CN') {
  const completedAtDate = new Date(completedAt)
  if (Number.isNaN(completedAtDate.getTime())) {
    return '--'
  }

  return completedAtDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getDayRangeLabel(day: SummaryTrainingHeatmapDay, locale: string) {
  if (!day.firstCompletedAt || !day.lastCompletedAt) {
    return '--'
  }

  const startedAt = formatTime(day.firstCompletedAt, locale)
  const endedAt = formatTime(day.lastCompletedAt, locale)

  return day.firstCompletedAt === day.lastCompletedAt ? startedAt : `${startedAt}-${endedAt}`
}

function getMondayFirstWeekLabels(locale: string) {
  return Array.from({ length: 7 }, (_, day) =>
    new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(
      new Date(2024, 0, day + 1),
    ),
  )
}

export function SummaryTrainingHeatmap({
  data,
  detailTo,
  error,
  isLoading,
  variant = 'card',
}: SummaryTrainingHeatmapProps) {
  const { i18n, t } = useTranslation()
  const locale = i18n.resolvedLanguage ?? i18n.language
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedDate, setSelectedDate] = useState<SelectedHeatmapDate | null>(null)
  const rangeKey = data ? `${data.startDateKey}:${data.endDateKey}` : ''
  const weekColumns = useMemo(() => buildWeekColumns(data?.days ?? []), [data])
  const monthGroups = useMemo(() => buildMonthGroups(data?.days ?? [], locale), [data, locale])
  const selectedDay = useMemo(
    () =>
      selectedDate?.rangeKey === rangeKey
        ? data?.days.find((day) => day.dateKey === selectedDate.dateKey) ?? null
        : null,
    [data, rangeKey, selectedDate],
  )
  const trainingDays = data?.days.filter((day) => day.completedSets > 0).length ?? 0
  const isPageVariant = variant === 'page'
  const weekLabels = getMondayFirstWeekLabels(locale)

  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement || !data || isPageVariant) {
      return
    }

    scrollElement.scrollLeft = scrollElement.scrollWidth
  }, [data, isPageVariant])

  if (isLoading) {
    return (
      <section className={[
        isPageVariant ? 'mx-4 mt-4 min-h-[calc(100dvh-7rem)]' : 'mx-4 mt-4 min-h-[50dvh]',
        'rounded-[1.5rem] bg-[var(--surface-container)] opacity-50 animate-pulse',
      ].join(' ')} />
    )
  }

  if (error) {
    return (
      <section className="mx-4 mt-4 rounded-[1.25rem] border border-[var(--error)]/30 bg-[var(--error-container)] px-5 py-4 text-sm text-[var(--on-error-container)]">
        {t('summary.heatmap.loadFailed')}
      </section>
    )
  }

  if (!data) {
    return null
  }

  const rangeLabel = t('summary.heatmap.rangeLabel', {
    end: formatSessionDateKey(data.endDateKey, { month: 'short', year: 'numeric' }, locale),
    start: formatSessionDateKey(data.startDateKey, { month: 'short', year: 'numeric' }, locale),
  })

  const sectionClassName = [
    'mx-4 mt-4 flex flex-col rounded-[1.5rem] bg-[var(--surface)] p-5',
    isPageVariant ? 'min-h-[calc(100dvh-7rem)]' : 'min-h-[56dvh]',
  ].join(' ')

  return (
    <section className={sectionClassName}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-[20px] font-bold text-[var(--on-surface)]">
            {detailTo && !isPageVariant ? (
              <Link to={detailTo} viewTransition className="inline-block max-w-full truncate">
                {t('summary.heatmap.title')}
              </Link>
            ) : (
              t('summary.heatmap.title')
            )}
          </h2>
          <p className="mt-1 text-[13px] font-medium text-[var(--on-surface-variant)]">{rangeLabel}</p>
        </div>
        <div className="flex shrink-0 items-start gap-2">
          <div className="text-right">
            <p className="text-[22px] font-black leading-7 text-[var(--on-surface)]">
              {t('common.sets', { value: data.totalCompletedSets })}
            </p>
            <p className="mt-1 text-[12px] font-semibold text-[var(--on-surface-variant)]">
              {t('summary.analytics.daysValue', { value: trainingDays })}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        {isPageVariant ? (
          <div className="grid grid-cols-3 gap-x-3 gap-y-4">
            {monthGroups.map((month) => (
              <div key={month.key} className="min-w-0">
                <p className="mb-2 truncate text-[12px] font-bold text-[var(--on-surface-variant)]">
                  {month.label}
                </p>
                <div className="grid grid-cols-7 gap-1">
                  {month.cells.map((day, dayIndex) => {
                    if (!day) {
                      return <span key={`empty-${dayIndex}`} className="aspect-square w-full" aria-hidden="true" />
                    }

                    const level = getHeatmapLevel(day.completedSets)
                    const isSelected = selectedDate?.rangeKey === rangeKey && day.dateKey === selectedDate.dateKey
                    const className = [
                      'aspect-square w-full rounded-[4px] border border-[var(--outline-variant)]/20 transition-transform',
                      day.completedSets > 0 ? 'active:scale-90' : '',
                      isSelected ? 'ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface)]' : '',
                    ].join(' ')
                    const cellStyle = { backgroundColor: `var(--heatmap-level-${level})` }

                    if (day.completedSets === 0) {
                      return (
                        <span
                          key={day.dateKey}
                          className={className}
                          style={cellStyle}
                          title={t('summary.heatmap.emptyDayLabel', { date: day.dateKey })}
                          aria-label={t('summary.heatmap.emptyDayLabel', { date: day.dateKey })}
                          role="img"
                        />
                      )
                    }

                    return (
                      <button
                        key={day.dateKey}
                        type="button"
                        onClick={() => setSelectedDate({ dateKey: day.dateKey, rangeKey })}
                        className={className}
                        style={cellStyle}
                        aria-pressed={isSelected}
                        aria-label={t('summary.heatmap.dayLabel', {
                          date: day.dateKey,
                          exercises: day.exerciseCount,
                          sets: day.completedSets,
                        })}
                        title={t('summary.heatmap.dayLabel', {
                          date: day.dateKey,
                          exercises: day.exerciseCount,
                          sets: day.completedSets,
                        })}
                      />
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-2.5">
            <div className="grid shrink-0 grid-rows-7 gap-1.5 pt-0.5">
              {weekLabels.map((label, index) => (
                <span
                  key={label}
                  className="flex h-5 w-7 items-center text-[10px] font-medium text-[var(--on-surface-variant)]"
                >
                  {index === 0 || index === 3 || index === 6 ? label : null}
                </span>
              ))}
            </div>
            <div ref={scrollRef} className="scrollbar-hide min-w-0 flex-1 overflow-x-auto pb-2 pl-1 pr-3 pt-1">
              <div className="flex w-max gap-1.5 pr-3">
                {weekColumns.map((week, weekIndex) => (
                  <div key={weekIndex} className="grid grid-rows-7 gap-1.5">
                    {week.map((day, dayIndex) => {
                      if (!day) {
                        return <span key={`empty-${dayIndex}`} className="h-5 w-5" aria-hidden="true" />
                      }

                      const level = getHeatmapLevel(day.completedSets)
                      const isSelected = selectedDate?.rangeKey === rangeKey && day.dateKey === selectedDate.dateKey
                      const className = [
                        'h-5 w-5 rounded-[5px] border border-[var(--outline-variant)]/20 transition-transform',
                        day.completedSets > 0 ? 'active:scale-90' : '',
                        isSelected ? 'ring-2 ring-[var(--primary)] ring-offset-1 ring-offset-[var(--surface)]' : '',
                      ].join(' ')
                      const cellStyle = { backgroundColor: `var(--heatmap-level-${level})` }

                      if (day.completedSets === 0) {
                        return (
                          <span
                            key={day.dateKey}
                            className={className}
                            style={cellStyle}
                            title={t('summary.heatmap.emptyDayLabel', { date: day.dateKey })}
                            aria-label={t('summary.heatmap.emptyDayLabel', { date: day.dateKey })}
                            role="img"
                          />
                        )
                      }

                      return (
                        <button
                          key={day.dateKey}
                          type="button"
                          onClick={() => setSelectedDate({ dateKey: day.dateKey, rangeKey })}
                          className={className}
                          style={cellStyle}
                          aria-pressed={isSelected}
                          aria-label={t('summary.heatmap.dayLabel', {
                            date: day.dateKey,
                            exercises: day.exerciseCount,
                            sets: day.completedSets,
                          })}
                          title={t('summary.heatmap.dayLabel', {
                            date: day.dateKey,
                            exercises: day.exerciseCount,
                            sets: day.completedSets,
                          })}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-medium text-[var(--on-surface-variant)]">
          {detailTo && !isPageVariant ? (
            <Link
              to={detailTo}
              viewTransition
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--surface-container)] hover:text-[var(--on-surface)]"
              aria-label={t('summary.heatmap.openFullYear')}
              title={t('summary.heatmap.openFullYear')}
            >
              <Maximize2 size={15} strokeWidth={2.1} aria-hidden="true" />
            </Link>
          ) : (
            <span className="h-8 w-8 shrink-0" aria-hidden="true" />
          )}
          <div className="flex items-center justify-end gap-2">
            <span>{t('summary.heatmap.less')}</span>
            {[0, 1, 2, 3, 4].map((level) => (
              <span
                key={level}
                className="h-3 w-3 rounded-[4px] border border-[var(--outline-variant)]/20"
                style={{ backgroundColor: `var(--heatmap-level-${level})` }}
                aria-hidden="true"
              />
            ))}
            <span>{t('summary.heatmap.more')}</span>
          </div>
        </div>
      </div>

      <div
        className={[
          'flex shrink-0 flex-col overflow-hidden rounded-[1.25rem] bg-[var(--surface-container)]/55 p-4',
          isPageVariant ? 'mt-5' : 'mt-8',
          isPageVariant ? 'h-[42dvh]' : 'h-[15rem]',
        ].join(' ')}
      >
        {selectedDay ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-[16px] font-bold text-[var(--on-surface)]">
                  {formatSessionDateKey(selectedDay.dateKey, {
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  }, locale)}
                </h3>
                <p className="mt-1 text-[12px] font-medium text-[var(--on-surface-variant)]">
                  {getDayRangeLabel(selectedDay, locale)}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[var(--primary-container)] px-3 py-1 text-[12px] font-semibold text-[var(--on-primary-container)]">
                {t('common.sets', { value: selectedDay.completedSets })}
              </span>
            </div>

            <div className="scrollbar-hide mt-4 min-h-0 flex-1 divide-y divide-[var(--outline-variant)]/25 overflow-y-auto">
              {selectedDay.exercises.map((exercise) => (
                <div key={exercise.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="min-w-0 truncate text-[14px] font-bold text-[var(--on-surface)]">
                      {getDisplayExerciseName(t, exercise)}
                    </p>
                    <span className="shrink-0 text-[12px] font-semibold text-[var(--on-surface-variant)]">
                      {t('common.sets', { value: exercise.completedSets })}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-2">
                    {exercise.setRecords.map((setRecord, index) => (
                      <div key={setRecord.id} className="flex items-center gap-3 text-[13px]">
                        <span className="w-12 shrink-0 text-[var(--on-surface-variant)]">
                          {formatTime(setRecord.completedAt, locale)}
                        </span>
                        <span className="w-10 shrink-0 text-[var(--on-surface-variant)]">
                          {t('summary.setNumber', { setNumber: index + 1 })}
                        </span>
                        <span className="min-w-0 flex-1 truncate font-medium text-[var(--on-surface)]">
                          {formatSetRecordValue(setRecord, exercise.measurementType, t)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-[10rem] items-center justify-center text-center">
            <div>
              <p className="text-[15px] font-bold text-[var(--on-surface)]">{t('summary.heatmap.selectDayTitle')}</p>
              <p className="mt-2 text-[13px] leading-5 text-[var(--on-surface-variant)]">
                {t('summary.heatmap.selectDayDescription')}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
