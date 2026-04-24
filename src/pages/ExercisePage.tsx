import { useNavigate, useParams } from 'react-router-dom'
import { useState, type FormEvent } from 'react'
import { motion } from 'framer-motion'

import { ExerciseHero } from '../components/exercise/ExerciseHero'
import { ExerciseLatestRecordCard } from '../components/exercise/ExerciseLatestRecordCard'
import { ExerciseMetaGrid } from '../components/exercise/ExerciseMetaGrid'
import { AnimatedContentSwap } from '../components/motion/AnimatedContentSwap'
import { ExerciseRecordSheet } from '../components/exercise/ExerciseRecordSheet'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { PageHeader } from '../components/ui/PageHeader'
import { Snackbar } from '../components/ui/Snackbar'
import { useNow } from '../hooks/useNow'
import { useBackLinkState } from '../hooks/useRouteBack'
import { useSnackbarMessage } from '../hooks/useSnackbarMessage'
import { useExercisePageData } from '../hooks/pages/useExercisePageData'
import { listSpringTransition } from '../components/motion/motion-tokens'

export function ExercisePage() {
  const { id = 'unknown' } = useParams()
  const navigate = useNavigate()
  const now = useNow(16)
  const {
    canCompleteSet,
    canUndoLatestSet,
    detail,
    error,
    handleCompleteSet,
    handleUndoLatestSet,
    handleUpdateLatestSetRecord,
    isLoading,
    isSubmitting,
    latestSetRecord,
    repsInput,
    setRepsInput,
    setWeightInput,
    weightInput,
  } = useExercisePageData(id)
  const { message, setMessage } = useSnackbarMessage()
  const [isRecordSheetOpen, setIsRecordSheetOpen] = useState(false)
  const backLinkState = useBackLinkState()

  async function handleCompleteCurrentSet() {
    const didComplete = await handleCompleteSet()
    if (didComplete && detail) {
      setMessage(`已完成第 ${detail.exercise.completedSets + 1} 组`)
    }
  }

  async function handleSaveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const didSave = await handleUpdateLatestSetRecord()
    if (didSave) {
      setIsRecordSheetOpen(false)
      setMessage('最近一组已更新')
    }
  }

  async function handleUndoPreviousSetCompletion() {
    if (!detail) {
      return
    }

    const undoneSetNumber = detail.exercise.completedSets
    const didUndo = await handleUndoLatestSet()
    if (didUndo) {
      setMessage(`已撤销第 ${undoneSetNumber} 组`)
    }
  }

  const menuItems = detail
    ? [
        {
          label: '撤销上组完成',
          disabled: !canUndoLatestSet,
          onSelect: () => void handleUndoPreviousSetCompletion(),
        },
        {
          label: '查看总结',
          onSelect: () => navigate(`/summary/${detail.session.id}`, { state: backLinkState }),
        },
      ]
    : []
  const isCompleted = detail?.exercise.status === 'completed'

  return (
    <div className="relative flex min-h-full flex-col pb-4">
      <PageHeader
        title={detail?.exercise.name ?? '动作页'}
        subtitle={
          detail
            ? `进度: ${Math.min(detail.exercise.completedSets + 1, detail.exercise.targetSets)} / ${detail.exercise.targetSets} 组`
            : '专注当前动作'
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
        <div className="mt-12 flex flex-1 flex-col items-center justify-center space-y-4 opacity-50 animate-pulse">
          <div className="h-4 w-24 rounded bg-[var(--surface-container)]" />
          <div className="h-16 w-48 rounded bg-[var(--surface-container)]" />
          <div className="mt-8 h-4 w-64 rounded bg-[var(--surface-container)]" />
        </div>
      ) : null}

      {!isLoading && !detail ? (
        <div className="mx-4 mt-6 rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
          <p className="text-base font-semibold text-[var(--on-surface)]">这个动作不存在</p>
          <p className="mt-2 text-sm text-[var(--on-surface-variant)]">返回安排页重新选择动作。</p>
        </div>
      ) : null}

      {detail ? (
        <>
          <div className="mx-4 mt-2 rounded-[1.5rem] border border-[var(--outline-variant)]/30 bg-[var(--surface)] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] overflow-hidden">
            <ExerciseHero detail={detail} now={now} />
            
            <div className="h-[1px] w-full bg-[var(--outline-variant)]/20" />
            
            <ExerciseLatestRecordCard
              latestSetRecord={latestSetRecord}
              onEdit={() => setIsRecordSheetOpen(true)}
            />
            
            <ExerciseMetaGrid
              name={detail.exercise.name}
              restSeconds={detail.exercise.restSeconds}
            />
          </div>

          <div className="mt-4 flex flex-1 items-center justify-center px-4 py-8">
            <motion.button
              layout
              type="button"
              disabled={!isCompleted && !canCompleteSet}
              onClick={
                isCompleted
                  ? () => navigate('/')
                  : () => void handleCompleteCurrentSet()
              }
              transition={listSpringTransition}
              className={[
                'flex h-[52px] w-full items-center justify-center rounded-xl text-[16px] font-bold shadow-[0_4px_12px_rgba(0,0,0,0.05)] transition-transform tap-highlight-transparent active:scale-[0.98] disabled:opacity-40',
                isCompleted
                  ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                  : 'bg-[var(--primary)] text-[var(--on-primary)] shadow-[0_4px_12px_rgba(22,78,48,0.2)]',
              ].join(' ')}
            >
              <AnimatedContentSwap contentKey={isCompleted ? 'completed' : detail.exercise.completedSets}>
                <span className="inline-flex items-center gap-2">
                  {isCompleted ? (
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
                      <span>选择其他动作</span>
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
                      <span>完成第 {detail.exercise.completedSets + 1} 组</span>
                    </>
                  )}
                </span>
              </AnimatedContentSwap>
            </motion.button>
          </div>
        </>
      ) : null}

      <ExerciseRecordSheet
        isOpen={isRecordSheetOpen}
        isSubmitting={isSubmitting}
        latestSetRecord={latestSetRecord}
        repsInput={repsInput}
        weightInput={weightInput}
        onClose={() => setIsRecordSheetOpen(false)}
        onRepsChange={setRepsInput}
        onSubmit={handleSaveRecord}
        onWeightChange={setWeightInput}
      />

      <Snackbar message={message} />
    </div>
  )
}
