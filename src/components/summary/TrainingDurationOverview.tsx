import { ArrowUpRight, Clock3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useBackLinkState } from '../../hooks/useRouteBack'
import { compareTrainingDuration, type TrainingDurationPoint } from '../../lib/training-duration'

export function TrainingDurationOverview({ points, today }: { points: TrainingDurationPoint[]; today: string }) {
  const { t, i18n } = useTranslation()
  const backLinkState = useBackLinkState()
  const comparison = compareTrainingDuration(points, today)
  const current = comparison.current
  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString(i18n.resolvedLanguage, {
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <Link
      to="/summary/duration"
      state={backLinkState}
      className="group mb-3 block rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_color-mix(in_srgb,var(--on-surface)_5%,transparent)] active:bg-[var(--surface-container)]"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Clock3 size={17} className="text-[var(--on-surface-variant)]" aria-hidden="true" />
          {t('duration.title')}
        </h2>
        <span className="flex items-center gap-1 text-xs font-medium text-[var(--on-surface-variant)]">
          {t('duration.viewTrend')}<ArrowUpRight size={16} aria-hidden="true" />
        </span>
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-xs text-[var(--on-surface-variant)]">{t('duration.today')}</p>
          <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">
            {current ? t('common.minutes', { value: current.minutes }) : '—'}
          </p>
        </div>
        <p className="pb-1 text-sm font-medium text-[var(--on-surface-variant)]">
          {t(`duration.status.${comparison.status}`)}
        </p>
      </div>
      {current && (
        <p className="mt-3 text-xs leading-5 text-[var(--on-surface-variant)]">
          {current.segments.map((segment) => `${formatTime(segment.startedAt)}–${formatTime(segment.endedAt)}`).join(' / ')}
        </p>
      )}
    </Link>
  )
}
