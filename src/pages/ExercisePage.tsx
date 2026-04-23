import { useNavigate, useParams } from 'react-router-dom'
import { useState, type FormEvent } from 'react'

import { ExerciseHero } from '../components/exercise/ExerciseHero'
import { ExerciseLatestRecordCard } from '../components/exercise/ExerciseLatestRecordCard'
import { ExerciseMetaGrid } from '../components/exercise/ExerciseMetaGrid'
import { ExerciseRecordSheet } from '../components/exercise/ExerciseRecordSheet'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { PageHeader } from '../components/ui/PageHeader'
import { Snackbar } from '../components/ui/Snackbar'
import { useNow } from '../hooks/useNow'
import { useSnackbarMessage } from '../hooks/useSnackbarMessage'
import { useExercisePageData } from '../hooks/pages/useExercisePageData'

export function ExercisePage() {
  const { id = 'unknown' } = useParams()
  const navigate = useNavigate()
  const now = useNow()
  const {
    canCompleteSet,
    detail,
    error,
    handleCompleteSet,
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

  const menuItems = detail
    ? [
        {
          label: '查看总结',
          onSelect: () => navigate(`/summary/${detail.session.id}`),
        },
      ]
    : []

  return (
    <div className="relative flex min-h-full flex-col pb-4">
      <PageHeader
        title={detail?.exercise.name ?? '动作页'}
        subtitle={
          detail
            ? `进度: ${Math.min(detail.exercise.completedSets + 1, detail.exercise.targetSets)} / ${detail.exercise.targetSets} 组`
            : '专注当前动作'
        }
        backTo="/"
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
          <ExerciseHero detail={detail} now={now} />
          <ExerciseLatestRecordCard
            latestSetRecord={latestSetRecord}
            onEdit={() => setIsRecordSheetOpen(true)}
          />
          <ExerciseMetaGrid
            name={detail.exercise.name}
            restSeconds={detail.exercise.restSeconds}
          />

          <div className="pointer-events-none fixed bottom-8 left-0 right-0 z-10 mx-auto flex max-w-[30rem] justify-center px-4">
            {detail.exercise.status !== 'completed' ? (
              <button
                type="button"
                disabled={!canCompleteSet}
                onClick={() => void handleCompleteCurrentSet()}
                className="pointer-events-auto flex h-[56px] items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-8 text-base font-medium text-[var(--on-primary)] shadow-[0_4px_14px_rgba(46,107,94,0.3)] transition-transform tap-highlight-transparent active:scale-95 disabled:opacity-40"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                完成第 {detail.exercise.completedSets + 1} 组
              </button>
            ) : null}
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
