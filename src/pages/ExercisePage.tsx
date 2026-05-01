import { useNavigate, useParams } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { ArrowRight, Pause } from 'lucide-react'

import { ExerciseHero } from '../components/exercise/ExerciseHero'
import { ExerciseLatestRecordCard } from '../components/exercise/ExerciseLatestRecordCard'
import { ExerciseMetaGrid } from '../components/exercise/ExerciseMetaGrid'
import { ExercisePageLoading } from '../components/exercise/ExercisePageLoading'
import { AnimatedContentSwap } from '../components/motion/AnimatedContentSwap'
import { ExerciseRecordInlineCard } from '../components/exercise/ExerciseRecordInlineCard'
import { AnimatedDialog } from '../components/motion/AnimatedDialog'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { PageHeader } from '../components/ui/PageHeader'
import { useNow } from '../hooks/useNow'
import { useBackLinkState } from '../hooks/useRouteBack'
import { useExercisePageData } from '../hooks/pages/useExercisePageData'
import { listSpringTransition } from '../components/motion/motion-tokens'
import { getRestTimerSnapshot, getRestTimerState } from '../lib/rest-timer'
import { getDisplayExerciseName } from '../lib/exercise-name'

type ExerciseSetProgressProps = {
  completedSets: number
  restElapsedRatio: number
  isResting: boolean
  targetSets: number
}

function ExerciseSetProgress({
  completedSets,
  restElapsedRatio,
  isResting,
  targetSets,
}: ExerciseSetProgressProps) {
  const { t } = useTranslation()
  const activeSegments = Math.min(completedSets, targetSets)

  return (
    <section className="px-4 pt-2" aria-label={t('exercise.setProgressLabel')}>
      <div className="flex items-center gap-6">
        <div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${targetSets}, minmax(0, 1fr))` }}>
          {Array.from({ length: targetSets }, (_, index) => {
            const isActive = index < activeSegments
            const isLatestRestingSet = isResting && index === activeSegments - 1

            return (
              <div
                key={index}
                className={[
                  'h-1 overflow-hidden rounded-full',
                  isActive ? (isLatestRestingSet ? 'bg-[var(--tertiary)]' : 'bg-[var(--primary)]') : 'bg-[var(--outline-variant)]/45',
                ].join(' ')}
              >
                {isLatestRestingSet ? (
                  <div
                    className="h-full origin-left rounded-full bg-[var(--primary)] will-change-transform"
                    style={{ transform: `scaleX(${restElapsedRatio})` }}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
        <p className="shrink-0 text-[15px] text-[var(--on-surface-variant)]">
          {t('exercise.setProgressValue', { current: activeSegments, total: targetSets })}
        </p>
      </div>
    </section>
  )
}

export function ExercisePage() {
  const { t } = useTranslation()
  const { id = 'unknown' } = useParams()
  const navigate = useNavigate()
  const now = useNow(16)
  const {
    canCompleteSet,
    canUndoExercise,
    canUndoLatestSet,
    detail,
    distanceInput,
    durationInput,
    error,
    handleCompleteSet,
    handleSkipRest,
    handleUndoExercise,
    handleUndoLatestSet,
    handleUpdateLatestSetRecord,
    isLoading,
    isSubmitting,
    latestSetRecord,
    measurementType,
    repsInput,
    setDistanceInput,
    setDurationInput,
    setRepsInput,
    setWeightInput,
    weightInput,
  } = useExercisePageData(id)
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false)
  const [isUndoExerciseDialogOpen, setIsUndoExerciseDialogOpen] = useState(false)
  const backLinkState = useBackLinkState()

  async function handleCompleteCurrentSet() {
    await handleCompleteSet()
  }

  async function handleSkipCurrentRest() {
    await handleSkipRest()
  }

  async function handleSaveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const didSave = await handleUpdateLatestSetRecord()
    if (didSave) {
      setIsRecordFormOpen(false)
    }
  }

  async function handleUndoPreviousSetCompletion() {
    if (!detail) {
      return
    }

    await handleUndoLatestSet()
  }

  async function handleUndoCurrentExercise() {
    const didUndo = await handleUndoExercise()
    if (didUndo) {
      setIsUndoExerciseDialogOpen(false)
      setIsRecordFormOpen(false)
    }
  }

  const displayExerciseName = detail ? getDisplayExerciseName(t, detail.exercise) : null
  const menuItems = detail
    ? [
        {
          label: t('exercise.undoLatestSet'),
          disabled: !canUndoLatestSet,
          onSelect: () => void handleUndoPreviousSetCompletion(),
        },
        {
          label: t('exercise.undoExercise'),
          danger: true,
          disabled: !canUndoExercise,
          onSelect: () => setIsUndoExerciseDialogOpen(true),
        },
        {
          label: t('exercise.viewSummary'),
          onSelect: () =>
            navigate(`/summary/${detail.session.id}`, {
              state: backLinkState,
              viewTransition: true,
            }),
        },
      ]
    : []
  const restSnapshot = detail
    ? getRestTimerSnapshot(getRestTimerState(detail.exercise), now)
    : null
  const isResting = restSnapshot?.status === 'running'
  const hasReachedTarget =
    detail !== null &&
    detail.exercise.completedSets >= detail.exercise.targetSets
  const isFinalResting = hasReachedTarget && isResting
  const isCompleted = hasReachedTarget && !isFinalResting
  const restElapsedRatio =
    detail && restSnapshot?.status === 'running'
      ? Math.min(1, Math.max(0, 1 - restSnapshot.remainingMs / Math.max(1, detail.exercise.restSeconds * 1000)))
      : 0

  return (
    <div className="relative flex h-[100dvh] overflow-hidden flex-col">
      <PageHeader
        title={displayExerciseName ?? t('exercise.pageTitle')}
        backFallbackTo="/"
        actions={menuItems.length > 0 ? <OverflowMenu items={menuItems} /> : undefined}
      />

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <ExercisePageLoading showHeader={false} />
      ) : null}

      {!isLoading && !detail ? (
        <div className="mx-4 mt-6 rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
          <p className="text-base font-semibold text-[var(--on-surface)]">{t('exercise.notFoundTitle')}</p>
          <p className="mt-2 text-sm text-[var(--on-surface-variant)]">{t('exercise.notFoundDescription')}</p>
        </div>
      ) : null}

      {detail ? (
        <>
          <ConfirmDialog
            open={isUndoExerciseDialogOpen}
            title={t('exercise.undoExerciseTitle')}
            description={t('exercise.undoExerciseDescription', {
              name: displayExerciseName ?? detail.exercise.name,
            })}
            confirmLabel={t('exercise.undoExercise')}
            danger
            onCancel={() => setIsUndoExerciseDialogOpen(false)}
            onConfirm={() => void handleUndoCurrentExercise()}
          />

          <ExerciseSetProgress
            completedSets={detail.exercise.completedSets}
            restElapsedRatio={restElapsedRatio}
            isResting={isResting}
            targetSets={detail.exercise.targetSets}
          />

          <main className="flex min-h-0 flex-1 flex-col px-4">
            <ExerciseHero detail={detail} now={now} />

            <ExerciseLatestRecordCard
              isResting={isResting}
              latestSetRecord={latestSetRecord}
              measurementType={measurementType}
              onEdit={() => setIsRecordFormOpen(true)}
              restSeconds={detail.exercise.restSeconds}
            />

            <ExerciseMetaGrid
              name={displayExerciseName ?? detail.exercise.name}
              restSeconds={detail.exercise.restSeconds}
            />

            <AnimatedDialog open={isRecordFormOpen} onClose={() => setIsRecordFormOpen(false)}>
              <ExerciseRecordInlineCard
                isSubmitting={isSubmitting}
                latestSetRecord={latestSetRecord}
                distanceInput={distanceInput}
                durationInput={durationInput}
                measurementType={measurementType}
                repsInput={repsInput}
                weightInput={weightInput}
                onCancel={() => setIsRecordFormOpen(false)}
                onDistanceChange={setDistanceInput}
                onDurationChange={setDurationInput}
                onRepsChange={setRepsInput}
                onSubmit={handleSaveRecord}
                onWeightChange={setWeightInput}
              />
            </AnimatedDialog>

            <div className="mt-8 bg-[var(--surface)] pb-[calc(1rem_+_env(safe-area-inset-bottom))] pt-2">
              <motion.button
                layout
                type="button"
                disabled={isFinalResting ? isSubmitting : !isCompleted && !canCompleteSet}
                onClick={
                  isFinalResting
                    ? () => void handleSkipCurrentRest()
                    : isCompleted
                    ? () => navigate('/', { viewTransition: true })
                    : () => void handleCompleteCurrentSet()
                }
                transition={listSpringTransition}
                className={[
                  'flex h-[56px] w-full items-center justify-center rounded-xl text-[16px] font-bold shadow-[var(--shadow-soft)] transition-transform tap-highlight-transparent active:scale-[0.98] disabled:opacity-40',
                  isFinalResting
                    ? 'bg-[var(--tertiary)] text-[var(--on-tertiary)]'
                    : 'bg-[var(--primary)] text-[var(--on-primary)]',
                ].join(' ')}
              >
                <AnimatedContentSwap
                  contentKey={isFinalResting ? 'final-resting' : isCompleted ? 'completed' : detail.exercise.completedSets}
                >
                  <span className="inline-flex items-center gap-2">
                    {isFinalResting ? (
                      <>
                        <Pause size={18} fill="currentColor" strokeWidth={0} aria-hidden="true" />
                        <span>{t('exercise.skipRest')}</span>
                      </>
                    ) : isCompleted ? (
                      <>
                        <ArrowRight size={19} strokeWidth={2.4} aria-hidden="true" />
                        <span>{t('exercise.chooseOtherExercise')}</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight size={19} strokeWidth={2.4} aria-hidden="true" />
                        <span>{t('exercise.completeSet', { setNumber: detail.exercise.completedSets + 1 })}</span>
                      </>
                    )}
                  </span>
                </AnimatedContentSwap>
              </motion.button>
            </div>
          </main>
        </>
      ) : null}

    </div>
  )
}
