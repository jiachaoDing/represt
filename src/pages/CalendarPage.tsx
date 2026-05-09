import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

import { CalendarMonthGrid } from '../components/calendar/CalendarMonthGrid'
import { PageHeader } from '../components/ui/PageHeader'
import { getSessionSummaryDetailByDateKey } from '../db/sessions'
import { listPlansWithExercises, type PlanWithExercises } from '../db/plans'
import { getTrainingCycle, getTrainingCycleDayForDate } from '../db/training-cycle'
import { useSessionDateKeys } from '../hooks/pages/useSessionDateKeys'
import {
  addMonthsToSessionDateKey,
  diffSessionDateKeys,
  formatSessionDateKey,
  getMonthCalendarDateCells,
  getTodaySessionDateKey,
  isSessionDateKey,
} from '../lib/session-date-key'
import type { TrainingCycle } from '../models/types'

function buildSummaryPath(dateKey: string) {
  return `/summary?date=${dateKey}`
}

export function CalendarPage() {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const todayDateKey = getTodaySessionDateKey()
  const selectedDateKey = useMemo(() => {
    const currentDate = searchParams.get('date')
    return isSessionDateKey(currentDate) ? currentDate : todayDateKey
  }, [searchParams, todayDateKey])
  const [visibleMonthDateKey, setVisibleMonthDateKey] = useState(selectedDateKey)
  const [plans, setPlans] = useState<PlanWithExercises[]>([])
  const [trainingCycle, setTrainingCycle] = useState<TrainingCycle | null>(null)
  const [selectedSummary, setSelectedSummary] =
    useState<Awaited<ReturnType<typeof getSessionSummaryDetailByDateKey>>>(null)
  const [isSelectedSummaryLoading, setIsSelectedSummaryLoading] = useState(true)
  const [detailError, setDetailError] = useState<string | null>(null)
  const { error, isLoading, sessionDateKeys } = useSessionDateKeys()
  const sessionDateKeySet = useMemo(() => new Set(sessionDateKeys), [sessionDateKeys])

  useEffect(() => {
    let isCancelled = false

    async function loadCalendarContext() {
      try {
        setDetailError(null)
        const [planItems, cycle] = await Promise.all([
          listPlansWithExercises(),
          getTrainingCycle(),
        ])

        if (!isCancelled) {
          setPlans(planItems)
          setTrainingCycle(cycle)
        }
      } catch (loadError) {
        if (!isCancelled) {
          console.error(loadError)
          setDetailError(t('calendar.contextLoadFailed'))
        }
      }
    }

    void loadCalendarContext()

    return () => {
      isCancelled = true
    }
  }, [t])

  useEffect(() => {
    let isCancelled = false

    async function loadSelectedSummary() {
      try {
        setDetailError(null)
        setIsSelectedSummaryLoading(true)
        const detail = await getSessionSummaryDetailByDateKey(selectedDateKey)

        if (!isCancelled) {
          setSelectedSummary(detail)
        }
      } catch (loadError) {
        if (!isCancelled) {
          console.error(loadError)
          setDetailError(t('calendar.detailLoadFailed'))
          setSelectedSummary(null)
        }
      } finally {
        if (!isCancelled) {
          setIsSelectedSummaryLoading(false)
        }
      }
    }

    void loadSelectedSummary()

    return () => {
      isCancelled = true
    }
  }, [selectedDateKey, t])
  const monthLabel = formatSessionDateKey(visibleMonthDateKey, {
    year: 'numeric',
    month: 'long',
  }, i18n.resolvedLanguage)
  const selectedDateLabel = formatSessionDateKey(selectedDateKey, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }, i18n.resolvedLanguage)
  const selectedFullDateLabel = formatSessionDateKey(selectedDateKey, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }, i18n.resolvedLanguage)
  const visibleMonthSessionCount = useMemo(() => {
    const visibleMonthPrefix = visibleMonthDateKey.slice(0, 7)
    return sessionDateKeys.filter((dateKey) => dateKey.startsWith(visibleMonthPrefix)).length
  }, [sessionDateKeys, visibleMonthDateKey])
  const selectedDateDistance = diffSessionDateKeys(selectedDateKey, todayDateKey)
  const selectedDateTone =
    selectedDateDistance === 0
      ? t('calendar.today')
      : selectedDateDistance > 0
        ? t('calendar.futureDate')
        : t('calendar.pastDate')
  const selectedDateHasSession = sessionDateKeySet.has(selectedDateKey)
  const selectedCycleDay = getTrainingCycleDayForDate(trainingCycle, selectedDateKey)
  const recordedPlan = selectedSummary?.session.plannedPlanId
    ? plans.find((plan) => plan.id === selectedSummary.session.plannedPlanId) ?? null
    : null
  const plannedPlan = selectedCycleDay?.slot.planId
    ? plans.find((plan) => plan.id === selectedCycleDay.slot.planId) ?? null
    : null
  const completedSetCount =
    selectedSummary?.exercises.reduce((sum, exercise) => sum + exercise.completedSets, 0) ?? 0
  const completedExerciseCount =
    selectedSummary?.exercises.filter((exercise) => exercise.completedSets > 0).length ?? 0
  const selectedPlanLabel = selectedSummary
    ? selectedSummary.session.plannedPlanNameSnapshot ??
      recordedPlan?.name ??
      (selectedSummary.session.plannedPlanId ? t('calendar.deletedPlan') : t('calendar.manualPlan'))
    : plannedPlan?.name ?? (selectedCycleDay ? t('calendar.restDay') : t('calendar.cycleNotSet'))
  const selectedDateSummary = selectedDateHasSession
    ? completedSetCount > 0
      ? t('calendar.completedSummary', { completedSetCount, completedExerciseCount })
      : t('calendar.recordedNoSets')
    : selectedDateDistance > 0
      ? plannedPlan
        ? t('calendar.plannedSummary', { exerciseCount: plannedPlan.exercises.length })
        : selectedCycleDay
          ? t('calendar.plannedRest')
          : t('calendar.noRecord')
      : t('calendar.noRecord')
  const calendarCells = useMemo(
    () => getMonthCalendarDateCells(visibleMonthDateKey),
    [visibleMonthDateKey],
  )

  function handleSelectDate(dateKey: string) {
    setSearchParams({ date: dateKey }, { state: location.state })

    if (dateKey.slice(0, 7) !== visibleMonthDateKey.slice(0, 7)) {
      setVisibleMonthDateKey(dateKey)
    }
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('calendar.title')}
        subtitle={selectedDateLabel}
        backFallbackTo={buildSummaryPath(selectedDateKey)}
      />

      <section className="mx-4 mt-4 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-3 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setVisibleMonthDateKey(addMonthsToSessionDateKey(visibleMonthDateKey, -1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
            aria-label={t('calendar.previousMonth')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className="text-center">
            <p className="text-[11px] text-[var(--on-surface-variant)]">{t('calendar.month')}</p>
            <p className="mt-1 text-[15px] font-semibold text-[var(--on-surface)]">{monthLabel}</p>
          </div>

          <button
            type="button"
            onClick={() => setVisibleMonthDateKey(addMonthsToSessionDateKey(visibleMonthDateKey, 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
            aria-label={t('calendar.nextMonth')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </section>

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      {detailError ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {detailError}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mx-4 mt-4 h-[22rem] rounded-[1.5rem] bg-[var(--surface-container)] opacity-50 animate-pulse" />
      ) : (
        <CalendarMonthGrid
          cells={calendarCells}
          onSelectDate={handleSelectDate}
          selectedDateKey={selectedDateKey}
          sessionDateKeySet={sessionDateKeySet}
        />
      )}

      {!isLoading ? (
        <section className="mx-4 mt-4 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-5 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[var(--on-surface-variant)]">
                {selectedDateTone}
              </p>
              <h2 className="mt-1 text-[18px] font-bold text-[var(--on-surface)]">
                {selectedFullDateLabel}
              </h2>
            </div>
            <span className="shrink-0 rounded-full bg-[var(--surface-container)] px-3 py-1 text-[12px] font-semibold text-[var(--on-surface-variant)]">
              {t('calendar.daysInMonth', { count: visibleMonthSessionCount })}
            </span>
          </div>

          <p className="mt-3 text-[13px] leading-5 text-[var(--on-surface-variant)]">
            {isSelectedSummaryLoading ? t('calendar.loadingDay') : selectedDateSummary}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-[var(--surface-container)] px-3 py-3">
              <p className="text-[11px] text-[var(--on-surface-variant)]">{t('calendar.plan')}</p>
              <p className="mt-1 truncate text-[15px] font-bold text-[var(--on-surface)]">
                {selectedPlanLabel}
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-container)] px-3 py-3">
              <p className="text-[11px] text-[var(--on-surface-variant)]">{t('calendar.completedSets')}</p>
              <p className="mt-1 text-[15px] font-bold text-[var(--on-surface)]">
                {isSelectedSummaryLoading ? '...' : t('common.sets', { value: completedSetCount })}
              </p>
            </div>
          </div>

          <Link
            to={buildSummaryPath(selectedDateKey)}
            viewTransition
            className="mt-4 inline-flex h-10 items-center justify-center rounded-xl bg-[var(--surface-container)] px-4 text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--outline-variant)]/20"
          >
            {t('calendar.viewDaySummary')}
          </Link>
        </section>
      ) : null}
    </div>
  )
}
