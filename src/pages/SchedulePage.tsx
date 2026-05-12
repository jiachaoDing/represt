import { useEffect, useMemo, useReducer, useState } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { TodayTrainingPlanCard } from '../components/training-cycle/TodayTrainingPlanCard'
import { SharedPlanImportSheet } from '../components/plans/SharedPlanImportSheet'
import { PageHeader } from '../components/ui/PageHeader'
import { SettingsButton } from '../components/settings/SettingsButton'
import { useNow } from '../hooks/useNow'
import { useSchedulePageData } from '../hooks/pages/useSchedulePageData'
import { getPlanColor } from '../lib/plan-color'
import { ScheduleExerciseList } from '../components/schedule/ScheduleExerciseList'
import { SchedulePlanSaveSheet } from '../components/schedule/SchedulePlanSaveSheet'
import { QuickTimerEntryButton } from '../components/exercise/QuickTimerEntryButton'
import { ExerciseQuickTimer } from '../components/exercise/ExerciseQuickTimer'
import { quickEaseTransition } from '../components/motion/motion-tokens'

const saveTodayAsPlanTipStorageKey = 'trainre.saveTodayAsPlanTipHidden.v1'
const saveTodayAsPlanUsedStorageKey = 'trainre.saveTodayAsPlanUsed.v1'

type SaveTodayAsPlanTipState = {
  canShow: boolean
  didCheck: boolean
  key: string | null
}

type SaveTodayAsPlanTipAction =
  | { type: 'enter'; key: string | null }
  | { type: 'check'; canShow: boolean; key: string }
  | { type: 'hide' }

function saveTodayAsPlanTipReducer(
  state: SaveTodayAsPlanTipState,
  action: SaveTodayAsPlanTipAction,
): SaveTodayAsPlanTipState {
  switch (action.type) {
    case 'enter':
      return state.key === action.key ? state : { canShow: false, didCheck: false, key: action.key }
    case 'check':
      return state.key === action.key
        ? { canShow: action.canShow, didCheck: true, key: action.key }
        : state
    case 'hide':
      return { ...state, canShow: false }
  }
}

function getStoredSaveTodayAsPlanTipHidden() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(saveTodayAsPlanTipStorageKey) === 'true'
}

function getStoredSaveTodayAsPlanUsed() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(saveTodayAsPlanUsedStorageKey) === 'true'
}

export function SchedulePage() {
  const { i18n, t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const reduceMotion = useReducedMotion()
  const now = useNow()
  const schedule = useSchedulePageData()
  const addedExerciseIds = useMemo<string[]>(
    () =>
      typeof location.state === 'object' &&
      location.state !== null &&
      'addedExerciseIds' in location.state &&
      Array.isArray(location.state.addedExerciseIds)
        ? location.state.addedExerciseIds.filter((id: unknown): id is string => typeof id === 'string')
        : [],
    [location.state],
  )
  const [isPlanSaveSheetOpen, setIsPlanSaveSheetOpen] = useState(false)
  const [isShareCodeSheetOpen, setIsShareCodeSheetOpen] = useState(false)
  const [initialEditExerciseId, setInitialEditExerciseId] = useState<string | null>(
    () => addedExerciseIds[0] ?? null,
  )
  const [isQuickTimerOpen, setIsQuickTimerOpen] = useState(false)
  const [isSaveTodayAsPlanTipHidden, setIsSaveTodayAsPlanTipHidden] = useState(
    getStoredSaveTodayAsPlanTipHidden,
  )
  const [isSaveTodayAsPlanUsed, setIsSaveTodayAsPlanUsed] = useState(
    getStoredSaveTodayAsPlanUsed,
  )
  const [saveTodayAsPlanTip, dispatchSaveTodayAsPlanTip] = useReducer(
    saveTodayAsPlanTipReducer,
    location.pathname === '/' ? location.key : null,
    (key): SaveTodayAsPlanTipState => ({ canShow: false, didCheck: false, key }),
  )
  const planColorMap = useMemo(
    () => new Map(schedule.plans.map((plan, index) => [plan.id, getPlanColor(index)])),
    [schedule.plans],
  )

  const todayStr = new Intl.DateTimeFormat(i18n.resolvedLanguage, {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date())
  const completedSets =
    schedule.currentSession?.exercises.reduce((sum, exercise) => sum + exercise.completedSets, 0) ?? 0
  const totalSets = schedule.currentSession?.exercises.reduce((sum, exercise) => sum + exercise.targetSets, 0) ?? 0
  const canSaveTodayAsPlan =
    !schedule.isLoading && (schedule.currentSession?.exercises.length ?? 0) > 0
  const canPromptSaveTodayAsPlan =
    !schedule.isLoading &&
    !isSaveTodayAsPlanUsed &&
    schedule.currentSession !== null &&
    schedule.currentSession.exercises.length > 0 &&
    schedule.currentSession.exercises.every(
      (exercise) => exercise.completedSets >= exercise.targetSets,
    )
  const currentSaveTodayAsPlanTipEntryKey = location.pathname === '/' ? location.key : null
  const shouldShowSaveTodayAsPlanTip =
    location.pathname === '/' &&
    !isSaveTodayAsPlanTipHidden &&
    saveTodayAsPlanTip.key === currentSaveTodayAsPlanTipEntryKey &&
    saveTodayAsPlanTip.canShow &&
    canPromptSaveTodayAsPlan
  const canShowAddExerciseButton = location.pathname === '/' && canSaveTodayAsPlan
  const isStarterState =
    !schedule.isLoading &&
    schedule.currentSession !== null &&
    schedule.currentSession.exercises.length === 0 &&
    completedSets === 0 &&
    (schedule.trainingCycle?.slots.length ?? 0) === 0
  const addExerciseButton =
    canShowAddExerciseButton && !isQuickTimerOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-x-0 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30 pointer-events-none">
            <div className="mx-auto flex max-w-[30rem] justify-end px-6">
              <button
                type="button"
                disabled={schedule.isSubmitting}
                onClick={openExercisePicker}
                    aria-label={t('schedule.addExercise')}
                className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 tap-highlight-transparent"
              >
                <Plus size={22} strokeWidth={2.5} />
              </button>
            </div>
          </div>,
          document.body,
        )
      : null
  const flipDirection = isQuickTimerOpen ? 1 : -1
  const pageFlipVariants = {
    initial: (direction: number) =>
      reduceMotion
        ? { opacity: 0 }
        : { opacity: 0, rotateX: direction * 82, scale: 0.985 },
    animate: {
      opacity: 1,
      rotateX: 0,
      scale: 1,
      transition: quickEaseTransition,
    },
    exit: (direction: number) =>
      reduceMotion
        ? { opacity: 0, transition: quickEaseTransition }
        : { opacity: 0, rotateX: direction * -82, scale: 0.985, transition: quickEaseTransition },
  }
  const pageFlipStyle = {
    backfaceVisibility: 'hidden',
    transformOrigin: 'center top',
  } as const

  useEffect(() => {
    dispatchSaveTodayAsPlanTip({ type: 'enter', key: currentSaveTodayAsPlanTipEntryKey })
  }, [currentSaveTodayAsPlanTipEntryKey])

  useEffect(() => {
    if (schedule.isLoading || addedExerciseIds.length === 0) {
      return
    }

    navigate('/', { replace: true, state: null })
  }, [addedExerciseIds, navigate, schedule.isLoading])

  useEffect(() => {
    if (
      currentSaveTodayAsPlanTipEntryKey === null ||
      schedule.isLoading ||
      saveTodayAsPlanTip.key !== currentSaveTodayAsPlanTipEntryKey ||
      saveTodayAsPlanTip.didCheck
    ) {
      return
    }

    dispatchSaveTodayAsPlanTip({
      canShow: canPromptSaveTodayAsPlan,
      key: currentSaveTodayAsPlanTipEntryKey,
      type: 'check',
    })
  }, [
    canPromptSaveTodayAsPlan,
    currentSaveTodayAsPlanTipEntryKey,
    saveTodayAsPlanTip.didCheck,
    saveTodayAsPlanTip.key,
    schedule.isLoading,
  ])

  function hideSaveTodayAsPlanTip() {
    window.localStorage.setItem(saveTodayAsPlanTipStorageKey, 'true')
    setIsSaveTodayAsPlanTipHidden(true)
  }

  function markSaveTodayAsPlanUsed() {
    window.localStorage.setItem(saveTodayAsPlanUsedStorageKey, 'true')
    setIsSaveTodayAsPlanUsed(true)
    dispatchSaveTodayAsPlanTip({ type: 'hide' })
  }

  function openExercisePicker() {
    navigate('/exercise-picker?target=today')
  }

  async function handleCreatePlanFromToday(name: string) {
    const didCreate = await schedule.handleCreatePlanFromToday(name)
    if (didCreate) {
      markSaveTodayAsPlanUsed()
    }

    return didCreate
  }

  async function handleOverwritePlanFromToday(planId: string) {
    const didOverwrite = await schedule.handleOverwritePlanFromToday(planId)
    if (didOverwrite) {
      markSaveTodayAsPlanUsed()
    }

    return didOverwrite
  }

  return (
    <div className="pb-4">
      <PageHeader 
        title={todayStr} 
        titleAlign="start"
        titleClassName="ml-[2ch]"
        actions={
          <div className="flex items-center gap-1">
            <QuickTimerEntryButton
              active={isQuickTimerOpen}
              now={now}
              onClick={() => setIsQuickTimerOpen((current) => !current)}
            />
            <SettingsButton />
          </div>
        }
      />

      <div className="relative overflow-hidden [perspective:1200px]">
        <AnimatePresence custom={flipDirection} initial={false} mode="wait">
          {isQuickTimerOpen ? (
            <motion.div
              key="quick-timer"
              custom={flipDirection}
              variants={pageFlipVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4"
              style={pageFlipStyle}
            >
              <ExerciseQuickTimer notificationPath="/" />
            </motion.div>
          ) : (
            <motion.div
              key="schedule-body"
              custom={flipDirection}
              variants={pageFlipVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="overflow-x-hidden"
              style={pageFlipStyle}
            >
              {!schedule.isLoading ? (
                <div className={isStarterState ? 'flex min-h-[calc(100vh-13rem-env(safe-area-inset-bottom))] items-center' : ''}>
                  <TodayTrainingPlanCard
                    cycle={schedule.trainingCycle}
                    currentIndex={schedule.todayCycleDay?.index ?? null}
                    didAutoImportToday={schedule.didAutoImportToday}
                    getPlanColor={(planId) => planColorMap.get(planId) ?? null}
                    todayPlanName={schedule.todayPlan?.name ?? null}
                    completedSets={completedSets}
                    totalSets={totalSets}
                    isStarterState={isStarterState}
                    onCreateExercise={openExercisePicker}
                    onImportPlan={() => setIsShareCodeSheetOpen(true)}
                  />
                </div>
              ) : null}

              {!schedule.isLoading && schedule.planSyncStatus.hasUpdates ? (
                <div className="mx-4 mb-4 rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-container)]/20 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--on-surface)]">
                        {t('schedule.planUpdatedTitle', { name: schedule.planSyncStatus.planName ?? t('common.planFallback') })}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
                        {t('schedule.planUpdatedDescription')}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={schedule.isSubmitting}
                      onClick={() => void schedule.handleSyncPlan()}
                      className="shrink-0 rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-50"
                    >
                      {t('schedule.syncPlan')}
                    </button>
                  </div>
                </div>
              ) : null}

              {schedule.error ? (
                <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
                  {schedule.error}
                </div>
              ) : null}

              {schedule.isLoading || !isStarterState ? (
                <section className="mt-2">
                  <ScheduleExerciseList
                    currentSession={schedule.currentSession}
                    hasPlans={schedule.hasPlans}
                    initialEditExerciseId={initialEditExerciseId}
                    isLoading={schedule.isLoading}
                    isSubmitting={schedule.isSubmitting}
                    now={now}
                    showSavePlanTip={shouldShowSaveTodayAsPlanTip}
                    onOpenAdd={openExercisePicker}
                    onOpenSavePlan={() => setIsPlanSaveSheetOpen(true)}
                    onDismissSavePlanTip={hideSaveTodayAsPlanTip}
                    onDeleteSelected={schedule.handleDeleteExercises}
                    onEditExercise={schedule.handleReplaceExercise}
                    onInitialEditHandled={() => setInitialEditExerciseId(null)}
                    onReorder={schedule.handleReorderExercises}
                  />
                </section>
              ) : null}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {addExerciseButton}

      <SchedulePlanSaveSheet
        currentPlanId={schedule.currentSession?.plannedPlanId ?? null}
        exerciseCount={schedule.currentSession?.exercises.length ?? 0}
        isOpen={isPlanSaveSheetOpen}
        isSubmitting={schedule.isSubmitting}
        plans={schedule.plans}
        onClose={() => setIsPlanSaveSheetOpen(false)}
        onCreatePlan={handleCreatePlanFromToday}
        onOverwritePlan={handleOverwritePlanFromToday}
      />

      <SharedPlanImportSheet
        open={isShareCodeSheetOpen}
        onClose={() => setIsShareCodeSheetOpen(false)}
        onImported={(plans, data) => {
          setIsShareCodeSheetOpen(false)
          navigate(data.cycle.length > 0 ? '/plans/cycle' : '/plans', {
            state: data.cycle.length > 0 ? undefined : { selectedPlanId: plans[0]?.id },
          })
        }}
      />

    </div>
  )
}
