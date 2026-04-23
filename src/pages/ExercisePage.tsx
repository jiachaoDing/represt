import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { BottomSheet } from '../components/ui/BottomSheet'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { PageHeader } from '../components/ui/PageHeader'
import { Snackbar } from '../components/ui/Snackbar'
import { useNow } from '../hooks/useNow'
import { useExercisePageData } from '../hooks/pages/useExercisePageData'
import {
  getCompletedAtLabel,
  getRepsLabel,
  getWeightLabel,
} from '../lib/session-display'
import { formatDuration, getRestTimerSnapshot, getRestTimerState } from '../lib/rest-timer'

function getHeroTone(state: 'completed' | 'counting' | 'ready' | 'resting') {
  if (state === 'completed') {
    return 'text-[var(--primary)]'
  }

  if (state === 'ready') {
    return 'text-[var(--primary)]'
  }

  if (state === 'resting') {
    return 'text-[var(--tertiary)]'
  }

  return 'text-[var(--on-surface)]'
}

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
  const [isRecordSheetOpen, setIsRecordSheetOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!snackbarMessage) {
      return
    }

    const timer = window.setTimeout(() => setSnackbarMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [snackbarMessage])

  const restSnapshot = useMemo(() => {
    if (!detail) {
      return null
    }

    return getRestTimerSnapshot(getRestTimerState(detail.exercise), now)
  }, [detail, now])

  const heroState = useMemo(() => {
    if (!detail) {
      return null
    }

    if (detail.exercise.status === 'completed') {
      return {
        label: '动作完成',
        state: 'completed' as const,
        supporting: '已达到目标组数，可以返回安排页查看其它动作。',
        value: `${detail.exercise.targetSets}/${detail.exercise.targetSets}`,
      }
    }

    if (restSnapshot?.status === 'running') {
      return {
        label: '休息中',
        state: 'resting' as const,
        supporting: '倒计时只负责提醒，你仍然可以随时完成下一组。',
        value: formatDuration(restSnapshot.remainingSeconds),
      }
    }

    if (restSnapshot?.status === 'ready') {
      return {
        label: '可继续下一组',
        state: 'ready' as const,
        supporting: '休息已结束，点击下方按钮完成下一组。',
        value: '00:00',
      }
    }

    return {
      label: '待完成当前组',
      state: 'counting' as const,
      supporting: '点击下方按钮即可记录当前组，随后可手动补录重量和次数。',
      value: `第 ${detail.exercise.completedSets + 1} 组`,
    }
  }, [detail, restSnapshot])

  async function handleCompleteCurrentSet() {
    const didComplete = await handleCompleteSet()
    if (didComplete && detail) {
      setSnackbarMessage(`已完成第 ${detail.exercise.completedSets + 1} 组`)
    }
  }

  async function handleSaveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const didSave = await handleUpdateLatestSetRecord()
    if (didSave) {
      setIsRecordSheetOpen(false)
      setSnackbarMessage('最近一组已更新')
    }
  }

  const menuItems = detail
    ? [
        {
          label: '查看总结',
          onSelect: () => {
            navigate(`/summary/${detail.session.id}`)
          },
        },
      ]
    : []

  return (
    <div className="flex min-h-full flex-col pb-4 relative">
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
        <div className="flex-1 flex flex-col justify-center items-center opacity-50 animate-pulse mt-12 space-y-4">
          <div className="h-4 w-24 bg-[var(--surface-container)] rounded"></div>
          <div className="h-16 w-48 bg-[var(--surface-container)] rounded"></div>
          <div className="h-4 w-64 bg-[var(--surface-container)] rounded mt-8"></div>
        </div>
      ) : null}

      {!isLoading && !detail ? (
        <div className="mx-4 rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center mt-6">
          <p className="text-base font-semibold text-[var(--on-surface)]">这个动作不存在</p>
          <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
            可能已经被删除，返回训练安排页重新选择动作。
          </p>
        </div>
      ) : null}

      {detail && heroState ? (
        <>
          <section className="flex flex-col items-center justify-center pt-16 pb-12 px-4 text-center">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--on-surface-variant)] mb-4">
              {heroState.label}
            </p>
            <h2 
              className={`text-6xl font-medium tracking-tighter ${getHeroTone(heroState.state)}`}
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {heroState.value}
            </h2>
            <p className="mt-8 text-sm text-[var(--on-surface-variant)] max-w-[240px]">
              {heroState.supporting}
            </p>
          </section>

          <section className="px-4 mt-4">
            <div className="rounded-2xl bg-[var(--surface-container)] px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-[var(--on-surface-variant)]">上一组记录</p>
                  {latestSetRecord ? (
                    <p className="mt-1 text-[15px] font-medium text-[var(--on-surface)]">
                      第 {latestSetRecord.setNumber} 组 · {getWeightLabel(latestSetRecord.weightKg)} · {getRepsLabel(latestSetRecord.reps)}
                    </p>
                  ) : (
                    <p className="mt-1 text-sm text-[var(--outline)]">
                      没有记录
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={!latestSetRecord}
                  onClick={() => setIsRecordSheetOpen(true)}
                  className="shrink-0 rounded-full border border-[var(--outline)] px-4 py-2 text-sm font-medium text-[var(--primary)] disabled:opacity-35 hover:bg-[var(--surface)] transition-colors tap-highlight-transparent"
                >
                  补录
                </button>
              </div>
            </div>
          </section>

          <div className="px-4 mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-[var(--outline-variant)] px-5 py-4">
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">当前动作</p>
              <p className="mt-1 text-sm font-medium text-[var(--on-surface)] truncate">{detail.exercise.name}</p>
            </div>
            <div className="rounded-2xl border border-[var(--outline-variant)] px-5 py-4">
              <p className="text-xs font-medium text-[var(--on-surface-variant)]">休息设置</p>
              <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">{detail.exercise.restSeconds} 秒</p>
            </div>
          </div>

          <div className="mt-auto fixed bottom-8 left-0 right-0 flex justify-center pointer-events-none z-10 px-4 max-w-[30rem] mx-auto">
            {detail.exercise.status !== 'completed' ? (
              <button
                type="button"
                disabled={!canCompleteSet}
                onClick={() => void handleCompleteCurrentSet()}
                className="pointer-events-auto flex items-center justify-center gap-2 h-[56px] rounded-full bg-[var(--primary)] px-8 text-base font-medium text-[var(--on-primary)] shadow-[0_4px_14px_rgba(46,107,94,0.3)] disabled:opacity-40 transition-transform active:scale-95 tap-highlight-transparent"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                完成第 {detail.exercise.completedSets + 1} 组
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      <BottomSheet
        open={isRecordSheetOpen}
        title="补录上一组"
        onClose={() => setIsRecordSheetOpen(false)}
      >
        {latestSetRecord ? (
          <div className="space-y-5 mt-2">
            <div className="flex gap-4 mb-2">
              <div className="flex-1 rounded-xl bg-[var(--surface-container)] px-4 py-3">
                <p className="text-xs font-medium text-[var(--on-surface-variant)]">
                  组序号
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">第 {latestSetRecord.setNumber} 组</p>
              </div>
              <div className="flex-1 rounded-xl bg-[var(--surface-container)] px-4 py-3">
                <p className="text-xs font-medium text-[var(--on-surface-variant)]">
                  完成时间
                </p>
                <p className="mt-1 text-sm font-medium text-[var(--on-surface)]">
                  {getCompletedAtLabel(latestSetRecord.completedAt)}
                </p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSaveRecord}>
              <div className="grid grid-cols-2 gap-4">
                <label className="block">
                  <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">重量 (kg)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    inputMode="decimal"
                    value={weightInput}
                    disabled={isSubmitting}
                    onChange={(event) => setWeightInput(event.target.value)}
                    className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
                  />
                </label>

                <label className="block">
                  <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">次数</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={repsInput}
                    disabled={isSubmitting}
                    onChange={(event) => setRepsInput(event.target.value)}
                    className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
                  />
                </label>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] disabled:opacity-40 transition-opacity"
                >
                  保存记录
                </button>
              </div>
            </form>
          </div>
        ) : (
          <p className="text-sm leading-6 text-[var(--on-surface-variant)] mt-2">
            还没有组记录。
          </p>
        )}
      </BottomSheet>

      <Snackbar message={snackbarMessage} />
    </div>
  )
}
