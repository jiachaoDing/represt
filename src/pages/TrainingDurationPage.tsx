import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { PageHeader } from '../components/ui/PageHeader'
import { useTrainingGrowth } from '../hooks/pages/useTrainingGrowth'
import { buildTrainingGrowth } from '../lib/training-growth'
import { compareTrainingDuration, getTrainingTimeDistribution } from '../lib/training-duration'
import { addDaysToSessionDateKey, formatSessionDateKey, getTodaySessionDateKey } from '../lib/session-date-key'

export function TrainingDurationPage() {
  const { t, i18n } = useTranslation()
  const today = getTodaySessionDateKey()
  const { snapshot, error, retry } = useTrainingGrowth()
  const [range, setRange] = useState(90)
  const growth = useMemo(() => snapshot ? buildTrainingGrowth(snapshot, today) : null, [snapshot, today])
  const comparison = useMemo(() => compareTrainingDuration(growth?.durationPoints ?? [], today), [growth, today])
  const points = useMemo(() => {
    const start = range ? addDaysToSessionDateKey(today, 1 - range) : ''
    return (growth?.durationPoints ?? []).filter((point) => point.dateKey >= start).map((point) => ({
      ...point, timestamp: new Date(`${point.dateKey}T12:00:00`).getTime(),
    }))
  }, [growth, today, range])
  const timeDistribution = useMemo(() => getTrainingTimeDistribution(points), [points])
  const formatMinutes = (value: number) => t('common.minutes', { value: Number(value.toFixed(1)) })
  const formatDate = (date: string) => formatSessionDateKey(date, { year: 'numeric', month: 'short', day: 'numeric' }, i18n.resolvedLanguage)

  return (
    <div className="pb-5 text-[var(--on-surface)]">
      <PageHeader title={t('duration.analysisTitle')} backFallbackTo="/summary" />
      {error ? (
        <div role="alert" className="m-4 rounded-2xl bg-[var(--error-container)] p-4 text-sm text-[var(--on-error-container)]">
          <p>{t('growth.loadFailed')}</p>
          <button type="button" onClick={retry} className="mt-2 min-h-11 font-semibold">{t('growth.retry')}</button>
        </div>
      ) : !growth ? <p role="status" className="p-4 text-sm">{t('growth.loading')}</p> : (
        <div className="px-4 pt-4">
          <p className="text-sm text-[var(--on-surface-variant)]">{t('duration.today')}</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums">
            {comparison.current ? formatMinutes(comparison.current.minutes) : '—'}
          </p>
          <p className="mt-3 text-sm font-medium">{t(`duration.status.${comparison.status}`)}</p>
          {comparison.baseline !== null && (
            <p className="mt-1 text-sm text-[var(--on-surface-variant)]">
              {t('duration.baseline', { count: comparison.sampleCount, minutes: formatMinutes(comparison.baseline) })}
            </p>
          )}
          <section className="mt-6" aria-labelledby="duration-trend">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="duration-trend" className="text-base font-semibold">{t('duration.trend')}</h2>
              <div role="group" aria-label={t('growth.range')} className="flex">
                {[30, 90, 0].map((days) => (
                  <button key={days} type="button" onClick={() => setRange(days)} aria-pressed={range === days}
                    className={`min-h-11 rounded-xl px-3 text-sm ${range === days
                      ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]' : 'text-[var(--on-surface-variant)]'}`}>
                    {t(days ? 'growth.rangeDays' : 'growth.all', { days })}
                  </button>
                ))}
              </div>
            </div>
            {points.length ? (
              <div className="mt-4 h-60" role="img" aria-label={t('duration.chartLabel', { count: points.length })}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={points} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--outline-variant)" strokeOpacity={0.4} />
                    <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']}
                      tickFormatter={(value) => new Date(value).toLocaleDateString(i18n.resolvedLanguage, { month: 'short', day: 'numeric' })}
                      minTickGap={30} axisLine={false} tickLine={false} tick={{ fill: 'var(--on-surface-variant)', fontSize: 11 }} />
                    <YAxis tickFormatter={formatMinutes} width={64} axisLine={false} tickLine={false}
                      tick={{ fill: 'var(--on-surface-variant)', fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatMinutes(Number(value))}
                      labelFormatter={(value) => new Date(Number(value)).toLocaleDateString(i18n.resolvedLanguage)}
                      contentStyle={{ background: 'var(--surface-container)', borderColor: 'var(--outline-variant)', borderRadius: 12, color: 'var(--on-surface)' }} />
                    <Line type="monotoneX" dataKey="minutes" name={t('duration.title')} stroke="var(--primary)" strokeWidth={2.5}
                      dot={points.length < 60 ? { r: 3, fill: 'var(--surface)' } : false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="py-8 text-sm text-[var(--on-surface-variant)]">{t('duration.emptyRange')}</p>}
          </section>
          <section className="mt-6" aria-labelledby="training-time-distribution">
            <h2 id="training-time-distribution" className="text-base font-semibold">{t('duration.timeOfDay')}</h2>
            {timeDistribution.primary.length ? (
              <>
                <p className="mb-4 mt-2 text-2xl font-semibold">
                  {timeDistribution.primary.map((item) => t(`summary.analytics.timeBuckets.${item.bucket}`)).join(' / ')}
                </p>
                <div className="space-y-3">
                  {timeDistribution.buckets.map((item) => (
                    <div key={item.bucket} className="grid grid-cols-[3.5rem_minmax(0,1fr)_3rem] items-center gap-3 text-sm">
                      <span>{t(`summary.analytics.timeBuckets.${item.bucket}`)}</span>
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-container)]" aria-hidden="true">
                        <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${item.fraction * 100}%` }} />
                      </div>
                      <span className="text-right tabular-nums text-[var(--on-surface-variant)]">
                        {t('summary.analytics.daysValue', { value: item.count })}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : <p className="mt-3 text-sm text-[var(--on-surface-variant)]">{t('duration.emptyRange')}</p>}
          </section>
          <details className="mt-4 text-sm text-[var(--on-surface-variant)]">
            <summary className="flex min-h-11 cursor-pointer items-center font-medium">{t('duration.methodTitle')}</summary>
            <p className="mt-1 leading-6">{t('duration.method')}</p>
            <p className="mt-2 leading-6">{t('duration.timeOfDayMethod')}</p>
          </details>
          <section className="mt-4" aria-labelledby="duration-dates">
            <h2 id="duration-dates" className="text-base font-semibold">{t('duration.recentDates')}</h2>
            <div className="mt-2 divide-y divide-[var(--outline-variant)]/20">
              {points.slice(-10).reverse().map((point) => (
                <Link key={point.dateKey} to={`/summary?date=${point.dateKey}`} state={{ backTo: '/summary/duration' }}
                  className="flex min-h-12 items-center justify-between gap-3 text-sm">
                  <span>{formatDate(point.dateKey)}</span>
                  <span className="font-semibold tabular-nums">{formatMinutes(point.minutes)}</span>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
