import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { GrowthExercise, GrowthPoint, GrowthSeries } from '../../lib/training-growth'
import { chartGrowthPoints, compareGrowth, pointsInRange } from '../../lib/training-growth'
import { formatSessionDateKey } from '../../lib/session-date-key'
import { formatDistanceMeters, formatDurationSeconds, formatSetRecordValue } from '../../lib/set-record-measurement'
import { formatWeightKg } from '../../lib/weight-units'

export function GrowthTrend({ exercise, today }: { exercise: GrowthExercise; today: string }) {
  const { t, i18n } = useTranslation()
  const [seriesId, setSeriesId] = useState('')
  const [range, setRange] = useState(90)
  const [date, setDate] = useState('')
  const series = exercise.series.find((item) => item.id === seriesId) ?? exercise.series[0]
  const points = useMemo(() => series ? pointsInRange(series, today, range) : [], [series, today, range])
  const chartPoints = useMemo(() => chartGrowthPoints(points).map((point) => ({
    ...point, timestamp: new Date(`${point.dateKey}T12:00:00`).getTime(),
  })), [points])
  const comparison = compareGrowth(points)
  const latest = points[points.length - 1]
  const selected = points.find((point) => point.dateKey === date) ?? latest
  const best = series?.points.reduce<GrowthPoint | undefined>((prior, point) =>
    !prior || point.value > prior.value ? point : prior, undefined)
  const formatValue = (value: number) => {
    if (series?.mode === 'weightReps' || series?.mode === 'leftRightWeightReps') return formatWeightKg(value, t)
    if (series?.mode === 'duration') return formatDurationSeconds(value, t)
    if (series?.mode === 'distance') return formatDistanceMeters(value, t)
    return t('common.reps', { value })
  }
  const seriesLabel = (item: GrowthSeries) => {
    if (item.reps === null) return t(`growth.metric.${item.mode}`)
    const label = t('growth.fixedReps', { reps: item.reps })
    return item.side ? `${t(`growth.side.${item.side}`)} · ${label}` : label
  }
  const formatDate = (key: string) => formatSessionDateKey(key, { year: 'numeric', month: 'short', day: 'numeric' }, i18n.resolvedLanguage)

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <label className="min-w-0 text-sm text-[var(--on-surface-variant)]">
          <span className="sr-only">{t('growth.comparisonMetric')}</span>
          <select
            className="min-h-11 max-w-full rounded-xl bg-[var(--surface-container)] px-3 text-[var(--on-surface)]"
            value={series?.id ?? ''}
            onChange={(event) => setSeriesId(event.target.value)}
            disabled={!series}
          >
            {!series && <option value="">{t('growth.noComparable')}</option>}
            {exercise.series.map((item) => <option key={item.id} value={item.id}>{seriesLabel(item)}</option>)}
          </select>
        </label>
        <div className="flex" role="group" aria-label={t('growth.range')}>
          {[30, 90, 0].map((days) => (
            <button
              key={days}
              type="button"
              aria-pressed={range === days}
              onClick={() => setRange(days)}
              className={`min-h-11 rounded-xl px-3 text-sm ${range === days
                ? 'bg-[var(--primary-container)] font-semibold text-[var(--on-primary-container)]'
                : 'text-[var(--on-surface-variant)]'}`}
            >
              {t(days ? 'growth.rangeDays' : 'growth.all', { days })}
            </button>
          ))}
        </div>
      </div>
      {latest ? (
        <>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-[var(--on-surface-variant)]">{t('growth.latest')} · {formatDate(latest.dateKey)}</p>
              <p className="mt-1 text-3xl font-bold tracking-tight">{formatValue(latest.value)}</p>
            </div>
            {best && <div className="text-sm">
              <p className="text-xs text-[var(--on-surface-variant)]">{t('growth.best')}</p>
              <p className="mt-1 font-semibold">{formatValue(best.value)}</p>
              <p className="text-xs text-[var(--on-surface-variant)]">{formatDate(best.dateKey)}</p>
            </div>}
          </div>
          <div className="mt-4 h-52 w-full" data-primary-tab-swipe-lock="true" role="img" aria-label={t('growth.chartLabel', { count: points.length, metric: seriesLabel(series) })}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartPoints}
                margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
                onClick={(state) => {
                  if (state.activeTooltipIndex == null) return
                  const point = chartPoints[Number(state.activeTooltipIndex)]
                  if (point) setDate(point.dateKey)
                }}
              >
                <CartesianGrid vertical={false} stroke="var(--outline-variant)" strokeOpacity={0.4} />
                <XAxis
                  dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']}
                  tickFormatter={(value) => new Date(value).toLocaleDateString(i18n.resolvedLanguage, { month: 'short', day: 'numeric' })}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 11 }}
                  minTickGap={30} axisLine={false} tickLine={false}
                />
                <YAxis
                  width={72} tickFormatter={formatValue}
                  tick={{ fill: 'var(--on-surface-variant)', fontSize: 11 }}
                  axisLine={false} tickLine={false}
                />
                <Tooltip
                  formatter={(value) => formatValue(Number(value))}
                  labelFormatter={(value) => new Date(Number(value)).toLocaleDateString(i18n.resolvedLanguage)}
                  contentStyle={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)', borderRadius: 12, color: 'var(--on-surface)' }}
                />
                <Line
                  type="monotoneX" dataKey="value" name={seriesLabel(series)}
                  stroke="var(--primary)" strokeWidth={2.5}
                  dot={chartPoints.length < 60 ? { r: 3, fill: 'var(--surface)' } : false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {points.length > 180 && <p className="mt-2 text-xs text-[var(--on-surface-variant)]">{t('growth.weeklyChart')}</p>}
          <label className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>{t('growth.inspectDate')}</span>
            <select className="min-h-11 rounded-xl bg-[var(--surface-container)] px-3" value={selected?.dateKey ?? ''} onChange={(event) => setDate(event.target.value)}>
              {[...points].reverse().map((point) => <option key={point.dateKey} value={point.dateKey}>{formatDate(point.dateKey)}</option>)}
            </select>
          </label>
          {selected && <p className="mt-2 text-sm font-medium">{formatSetRecordValue(selected.record, series.mode, t)}</p>}
          {comparison ? <div className="mt-4 border-t border-[var(--outline-variant)]/30 pt-4 text-sm">
            <p className="font-semibold">{t('growth.stageComparison', { previous: formatValue(comparison.previous), recent: formatValue(comparison.recent) })}</p>
            <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">{t('growth.stageDates', { start: formatDate(comparison.previousStart), end: formatDate(comparison.previousEnd), recentStart: formatDate(comparison.recentStart), recentEnd: formatDate(comparison.recentEnd) })}</p>
          </div> : <p className="mt-4 text-sm text-[var(--on-surface-variant)]">{t('growth.needSix', { count: points.length })}</p>}
        </>
      ) : <p className="py-8 text-sm leading-6 text-[var(--on-surface-variant)]">{t(series ? 'growth.emptyRange' : 'growth.unsupported')}</p>}
      <details className="mt-4 text-xs leading-5 text-[var(--on-surface-variant)]">
        <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t('growth.compact.aboutMetric')}</summary>
        <p>{t('growth.method')}</p>
      </details>
    </>
  )
}
