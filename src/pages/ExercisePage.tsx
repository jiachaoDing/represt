import { useNavigate, useParams } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'

import { ExerciseHero } from '../components/exercise/ExerciseHero'
import { ExerciseLatestRecordCard } from '../components/exercise/ExerciseLatestRecordCard'
import { ExerciseMetaGrid } from '../components/exercise/ExerciseMetaGrid'
import { ExercisePageLoading } from '../components/exercise/ExercisePageLoading'
import { AnimatedContentSwap } from '../components/motion/AnimatedContentSwap'
import { ExerciseRecordInlineCard } from '../components/exercise/ExerciseRecordInlineCard'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { PageHeader } from '../components/ui/PageHeader'
import { useNow } from '../hooks/useNow'
import { useBackLinkState } from '../hooks/useRouteBack'
import { useExercisePageData } from '../hooks/pages/useExercisePageData'
import { listSpringTransition } from '../components/motion/motion-tokens'
import { getRestTimerSnapshot, getRestTimerState } from '../lib/rest-timer'
import { getDisplayExerciseName } from '../lib/exercise-name'

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

  return (
    <div className="relative flex min-h-full flex-col pb-4">
      <PageHeader
        title={displayExerciseName ?? t('exercise.pageTitle')}
        subtitle={
          detail
            ? t('exercise.subtitle', {
                current: Math.min(detail.exercise.completedSets + 1, detail.exercise.targetSets),
                total: detail.exercise.targetSets,
              })
            : t('exercise.subtitleFallback')
        }
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

          <div className="mx-4 mt-2 rounded-[1.5rem] border border-[var(--outline-variant)]/30 bg-[var(--surface)] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
            <ExerciseHero detail={detail} now={now} />
            
            <div className="h-[1px] w-full bg-[var(--outline-variant)]/20" />
            
            <ExerciseLatestRecordCard
              latestSetRecord={latestSetRecord}
              measurementType={measurementType}
              onEdit={() => setIsRecordFormOpen(true)}
            />
            
            <ExerciseMetaGrid
              name={displayExerciseName ?? detail.exercise.name}
              restSeconds={detail.exercise.restSeconds}
            />
          </div>

          {isRecordFormOpen ? (
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
          ) : null}

          <div className="mt-4 flex flex-1 items-center justify-center px-4 py-8">
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
                'flex h-[52px] w-full items-center justify-center rounded-xl text-[16px] font-bold shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-transform tap-highlight-transparent active:scale-[0.98] disabled:opacity-40',
                isCompleted || isFinalResting
                  ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                  : 'bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_4px_12px_rgba(22,78,48,0.2)]',
              ].join(' ')}
            >
              <AnimatedContentSwap
                contentKey={isFinalResting ? 'final-resting' : isCompleted ? 'completed' : detail.exercise.completedSets}
              >
                <span className="inline-flex items-center gap-2">
                  {isFinalResting ? (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                      <span>{t('exercise.skipRest')}</span>
                    </>
                  ) : isCompleted ? (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                      <span>{t('exercise.chooseOtherExercise')}</span>
                    </>
                  ) : (
                    <>
                      <svg
                        viewBox="0 0 24 24"
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                      <span>{t('exercise.completeSet', { setNumber: detail.exercise.completedSets + 1 })}</span>
                    </>
                  )}
                </span>
              </AnimatedContentSwap>
            </motion.button>
          </div>
        </>
      ) : null}

    </div>
  )
}
