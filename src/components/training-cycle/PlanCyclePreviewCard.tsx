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
  selectedIndex: number | null
  onSelect: (index: number) => void
  getDayLabel: (index: number) => string
  disabled: boolean
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
  selectedIndex,
  onSelect,
  getDayLabel,
  disabled,
}: PlanCyclePreviewCardProps) {
  const { t } = useTranslation()
  const isConfigured = (cycle?.slots.length ?? 0) > 0
  const backLinkState = useBackLinkState()
  const previewTitle = !isConfigured
    ? t('trainingCycle.cycleNotSet')
    : selectedIndex !== null || planId
      ? getNextTrainingLabel(daysUntil, t)
      : t('trainingCycle.cycleSet')

  return (
    <div className="mx-4 mt-2">
      <div className="flex min-h-11 items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[17px] font-semibold text-[var(--on-surface)]">
            {previewTitle}
          </p>
          {!isConfigured ? (
            <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
              {t('trainingCycle.autoImportHint')}
            </p>
          ) : null}
        </div>
        <Link
          to="/plans/cycle"
          state={backLinkState}
          viewTransition
          aria-label={isConfigured ? t('trainingCycle.editCycle') : t('trainingCycle.setCycle')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]"
        >
          <ArrowUpRight size={20} aria-hidden="true" />
        </Link>
      </div>

      <div data-primary-tab-swipe-lock="true" data-plan-view-navigation="true">
        {isConfigured && cycle ? (
          <TrainingCycleDots
            slots={cycle.slots}
            currentIndex={currentIndex}
            getPlanColor={getPlanColor}
            highlightedPlanId={planId ?? null}
            selectedIndex={selectedIndex}
            onSelect={onSelect}
            getDayLabel={getDayLabel}
            disabled={disabled}
          />
        ) : (
          <div />
        )}
      </div>
    </div>
  )
}
