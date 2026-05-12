import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useBackLinkState } from '../../hooks/useRouteBack'
import { TrainingCycleDots } from './TrainingCycleDots'
import type { TrainingCycle } from '../../models/types'
import type { PlanColor } from '../../lib/plan-color'

type PlanCyclePreviewCardProps = {
  cycle: TrainingCycle | null
  currentIndex: number | null
  daysUntil: number | null
  getPlanColor: (planId: string) => PlanColor | null
  planId: string | null
  planName: string | null
}

function getNextTrainingLabel(
  daysUntil: number | null,
  t: ReturnType<typeof useTranslation>['t'],
) {
  if (daysUntil === null) {
    return t('trainingCycle.notInCycle')
  }

  if (daysUntil === 0) {
    return t('trainingCycle.today')
  }

  return t('trainingCycle.daysUntil', { days: daysUntil })
}

export function PlanCyclePreviewCard({
  cycle,
  currentIndex,
  daysUntil,
  getPlanColor,
  planId,
  planName,
}: PlanCyclePreviewCardProps) {
  const { t } = useTranslation()
  const isConfigured = (cycle?.slots.length ?? 0) > 0
  const backLinkState = useBackLinkState()
  const previewTitle = !isConfigured
    ? t('trainingCycle.cycleNotSet')
    : planId
      ? getNextTrainingLabel(daysUntil, t)
      : t('trainingCycle.cycleSet')

  return (
    <Link
      to="/plans/cycle"
      state={backLinkState}
      viewTransition
      aria-label={isConfigured ? t('trainingCycle.editCycle') : t('trainingCycle.setCycle')}
      className="group relative mx-4 mt-4 block rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 pr-12 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] transition-colors hover:bg-[var(--surface-container)]/35"
    >
      <span
        className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--outline-variant)]/20 bg-[var(--surface-container)]/60 text-[var(--primary)] opacity-60 transition-opacity group-active:opacity-80"
        aria-hidden="true"
      >
        <ArrowUpRight size={14} strokeWidth={2.25} />
      </span>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] text-[var(--on-surface-variant)]">
            {t('trainingCycle.nextTraining')}
          </p>
          <p className="mt-1 text-[17px] font-semibold text-[var(--on-surface)]">
            {previewTitle}
          </p>
          {!isConfigured ? (
            <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
              {t('trainingCycle.autoImportHint')}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        {isConfigured && cycle ? (
          <TrainingCycleDots
            slots={cycle.slots}
            currentIndex={currentIndex}
            getPlanColor={getPlanColor}
            highlightedPlanId={planId ?? null}
          />
        ) : (
          <div />
        )}

        <div className="text-right text-[12px] text-[var(--on-surface-variant)]">
          <p>
            {isConfigured && planId && planName
              ? planName
              : isConfigured
                ? t('trainingCycle.cyclePreview')
                : t('trainingCycle.title')}
          </p>
          <p className="mt-1">
            {isConfigured && cycle
              ? t('trainingCycle.currentCycleDays', { days: cycle.slots.length })
              : t('trainingCycle.uninitialized')}
          </p>
        </div>
      </div>
    </Link>
  )
}
