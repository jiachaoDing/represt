import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { useBackLinkState } from '../../hooks/useRouteBack'
import { TrainingCycleDots } from './TrainingCycleDots'
import type { TrainingCycle } from '../../models/types'
import type { PlanColor } from '../../lib/plan-color'

type TodayTrainingPlanCardProps = {
  cycle: TrainingCycle | null
  currentIndex: number | null
  didAutoImportToday: boolean
  getPlanColor: (planId: string) => PlanColor | null
  todayPlanName: string | null
  completedSets: number
  totalSets: number
  isStarterState?: boolean
  onCreateExercise?: () => void
  onImportPlan?: () => void
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const radius = 28
  const stroke = 5
  const normalizedRadius = radius - stroke
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset =
    total === 0 ? circumference : circumference - (completed / total) * circumference

  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90 transform">
        <circle
          stroke="var(--primary-container)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="var(--primary)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[12px] font-bold text-[var(--primary)]">{percentage}%</span>
      </div>
    </div>
  )
}

export function TodayTrainingPlanCard({
  cycle,
  currentIndex,
  didAutoImportToday,
  getPlanColor,
  todayPlanName,
  completedSets,
  totalSets,
  isStarterState = false,
  onCreateExercise,
  onImportPlan,
}: TodayTrainingPlanCardProps) {
  const { t } = useTranslation()
  void didAutoImportToday
  const isConfigured = (cycle?.slots.length ?? 0) > 0
  const backLinkState = useBackLinkState()

  if (isStarterState) {
    return (
      <section className="mx-auto w-full max-w-sm px-8 py-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--on-surface-variant)]">
          {t('schedule.starterKicker')}
        </p>
        <div className="mt-2 min-w-0">
          <h2 className="text-[24px] font-bold leading-tight text-[var(--on-surface)]">
            {t('schedule.starterTitle')}
          </h2>
          <p className="mx-auto mt-1 max-w-[18rem] text-sm leading-5 text-[var(--on-surface-variant)]">
            {t('schedule.starterDescription')}
          </p>
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onCreateExercise}
            className="min-h-12 w-full rounded-full bg-[var(--primary)] px-5 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-40"
            disabled={!onCreateExercise}
          >
            {t('schedule.addFirstExercise')}
          </button>
        </div>

        <div className="mt-3 flex items-center justify-center">
          <button
            type="button"
            onClick={onImportPlan}
            className="min-h-10 text-sm font-semibold text-[var(--primary)] disabled:opacity-40"
            disabled={!onImportPlan}
          >
            {t('schedule.importPlanEntry')}
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="mx-4 mb-6 mt-2 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-1.5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] flex items-stretch">
      <Link 
        to="/plans/cycle"
        state={backLinkState}
        viewTransition
        className="group relative flex-1 flex flex-col justify-center rounded-[1rem] p-3.5 pr-9 hover:bg-[var(--on-surface)]/5 active:bg-[var(--on-surface)]/10 transition-colors"
      >
        <span
          className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-[var(--outline-variant)]/20 bg-[var(--surface-container)]/60 text-[var(--primary)] opacity-60 transition-opacity group-active:opacity-80"
          aria-hidden="true"
        >
          <ArrowUpRight size={14} strokeWidth={2.25} />
        </span>

        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--on-surface-variant)] uppercase">
            {t('trainingCycle.todayPlan')}
          </p>
          <h2 className="mt-1.5 text-[18px] font-bold text-[var(--on-surface)] leading-tight">
            {!isConfigured
              ? t('trainingCycle.noCycleSchedule')
              : todayPlanName
                ? todayPlanName
                : t('trainingCycle.restDay')}
          </h2>
          {!isConfigured ? (
            <p className="mt-1 text-[12px] font-medium text-[var(--primary)]">
              {t('trainingCycle.tapToSetCycle')}
            </p>
          ) : null}
        </div>

        {isConfigured && cycle ? (
          <div className="mt-3">
            <TrainingCycleDots
              slots={cycle.slots}
              currentIndex={currentIndex}
              getPlanColor={getPlanColor}
            />
          </div>
        ) : null}
      </Link>
      
      <div className="my-3 w-px bg-[var(--outline-variant)]/30" />
      
      <div className="flex w-[88px] shrink-0 flex-col items-center justify-center rounded-[1rem] p-2">
        <ProgressRing completed={completedSets} total={totalSets} />
        <span className="mt-2 text-[12px] font-medium text-[var(--on-surface-variant)]">
          {t('trainingCycle.completedSets', { completed: completedSets, total: totalSets })}
        </span>
      </div>
    </section>
  )
}
