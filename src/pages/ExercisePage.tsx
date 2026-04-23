import { useNavigate, useParams } from 'react-router-dom'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { BottomSheet } from '../components/ui/BottomSheet'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { PageHeader } from '../components/ui/PageHeader'
import { Snackbar } from '../components/ui/Snackbar'
import { StatusPill } from '../components/ui/StatusPill'
import { useNow } from '../hooks/useNow'
import { useExercisePageData } from '../hooks/pages/useExercisePageData'
import { getCurrentSetDurationLabel, getRepsLabel, getWeightLabel } from '../lib/session-display'
import { formatDuration, getRestTimerSnapshot, getRestTimerState } from '../lib/rest-timer'

function getHeroTone(state: 'completed' | 'counting' | 'ready' | 'resting') {
  if (state === 'completed') {
    return 'bg-[linear-gradient(180deg,#dcefd7_0%,#cfe5cb_100%)] text-[var(--brand-strong)]'
  }

  if (state === 'ready') {
    return 'bg-[linear-gradient(180deg,#eef8ea_0%,#dcefd7_100%)] text-[var(--brand-strong)]'
  }

  if (state === 'resting') {
    return 'bg-[linear-gradient(180deg,#f7f4ec_0%,#efe4c8_100%)] text-[var(--ink-primary)]'
  }

  return 'bg-[linear-gradient(180deg,#eef2eb_0%,#dde6da_100%)] text-[var(--ink-primary)]'
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
    timingStartedAt,
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
        supporting: '休息已结束，主操作保持在底部拇指热区。',
        value: '00:00',
      }
    }

    return {
      label: '当前组计时',
      state: 'counting' as const,
      supporting: '进入动作页后开始计时，点击一次即记录本组。',
      value: getCurrentSetDurationLabel(timingStartedAt, now),
    }
  }, [detail, now, restSnapshot, timingStartedAt])

  async function handleCompleteCurrentSet() {
    const didComplete = await handleCompleteSet()
    if (didComplete && detail) {
      setIsRecordSheetOpen(true)
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
    <div className="flex min-h-full flex-col gap-4 pb-4">
      <PageHeader
        title={detail?.exercise.name ?? '动作页'}
        subtitle={
          detail
            ? `第 ${Math.min(detail.exercise.completedSets + 1, detail.exercise.targetSets)} / ${detail.exercise.targetSets} 组`
            : '专注当前动作'
        }
        backTo="/"
        actions={menuItems.length > 0 ? <OverflowMenu items={menuItems} /> : undefined}
      />

      {error ? (
        <div className="rounded-[1.25rem] border border-[var(--surface-danger)] bg-[rgba(255,218,214,0.65)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-[21rem] rounded-[2rem] border border-[var(--outline-soft)] bg-[rgba(255,255,255,0.7)]" />
          <div className="h-[4.5rem] rounded-[1.5rem] border border-[var(--outline-soft)] bg-[rgba(255,255,255,0.7)]" />
          <div className="h-16 rounded-[1.5rem] border border-[var(--outline-soft)] bg-[rgba(255,255,255,0.7)]" />
        </div>
      ) : null}

      {!isLoading && !detail ? (
        <div className="rounded-[1.75rem] border border-[var(--outline-soft)] bg-[var(--surface)] px-5 py-6 shadow-[var(--shadow-soft)]">
          <p className="text-base font-semibold text-[var(--ink-primary)]">这个动作不存在</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
            可能已经被删除，返回训练安排页重新选择动作。
          </p>
        </div>
      ) : null}

      {detail && heroState ? (
        <>
          <section
            className={`rounded-[2rem] px-5 py-6 shadow-[var(--shadow-soft)] ${getHeroTone(heroState.state)}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] opacity-70">
                  {heroState.label}
                </p>
                <h2 className="mt-3 text-[4rem] font-semibold leading-none tracking-[-0.06em]">
                  {heroState.value}
                </h2>
              </div>
              <StatusPill value={`${detail.exercise.completedSets} / ${detail.exercise.targetSets} 组`} />
            </div>
            <p className="mt-5 text-sm leading-6 opacity-80">{heroState.supporting}</p>
          </section>

          <section className="rounded-[1.5rem] border border-[var(--outline-soft)] bg-[var(--surface-raised)] px-4 py-4 shadow-[var(--shadow-soft)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ink-tertiary)]">
                  上一组记录
                </p>
                {latestSetRecord ? (
                  <p className="mt-2 text-sm text-[var(--ink-primary)]">
                    第 {latestSetRecord.setNumber} 组 · {formatDuration(latestSetRecord.durationSeconds)} ·{' '}
                    {getWeightLabel(latestSetRecord.weightKg)} · {getRepsLabel(latestSetRecord.reps)}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                    还没有组记录，完成一组后会自动打开补录层。
                  </p>
                )}
              </div>
              <button
                type="button"
                disabled={!latestSetRecord}
                onClick={() => setIsRecordSheetOpen(true)}
                className="rounded-full border border-[var(--outline-soft)] px-4 py-3 text-sm font-medium text-[var(--ink-primary)] disabled:opacity-35"
              >
                补录
              </button>
            </div>
          </section>

          <div className="mt-auto space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="grid grid-cols-2 gap-3 rounded-[1.5rem] border border-[var(--outline-soft)] bg-[var(--surface-raised)] px-4 py-4 shadow-[var(--shadow-soft)]">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ink-tertiary)]">
                  当前动作
                </p>
                <p className="mt-2 text-sm text-[var(--ink-primary)]">{detail.exercise.name}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ink-tertiary)]">
                  休息设置
                </p>
                <p className="mt-2 text-sm text-[var(--ink-primary)]">{detail.exercise.restSeconds} 秒</p>
              </div>
            </div>

            <button
              type="button"
              disabled={!canCompleteSet}
              onClick={() => void handleCompleteCurrentSet()}
              className="w-full rounded-[1.5rem] bg-[var(--brand)] px-6 py-5 text-base font-semibold text-white shadow-[var(--shadow-soft)] disabled:opacity-40"
            >
              {detail.exercise.status === 'completed'
                ? '动作已完成'
                : `完成第 ${detail.exercise.completedSets + 1} 组`}
            </button>
          </div>
        </>
      ) : null}

      <BottomSheet
        open={isRecordSheetOpen}
        title="最近一组"
        description="补录入口降级到弹层，不再占据训练主画面。"
        onClose={() => setIsRecordSheetOpen(false)}
      >
        {latestSetRecord ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[1.25rem] bg-[rgba(24,32,22,0.04)] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ink-tertiary)]">
                  组序号
                </p>
                <p className="mt-2 text-sm text-[var(--ink-primary)]">第 {latestSetRecord.setNumber} 组</p>
              </div>
              <div className="rounded-[1.25rem] bg-[rgba(24,32,22,0.04)] px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-[var(--ink-tertiary)]">
                  本组用时
                </p>
                <p className="mt-2 text-sm text-[var(--ink-primary)]">
                  {formatDuration(latestSetRecord.durationSeconds)}
                </p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSaveRecord}>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[var(--ink-primary)]">重量 (kg)</span>
                  <input
                    type="number"
                    min={0}
                    step="0.5"
                    inputMode="decimal"
                    value={weightInput}
                    disabled={isSubmitting}
                    onChange={(event) => setWeightInput(event.target.value)}
                    className="w-full rounded-[1.15rem] border border-[var(--outline-soft)] bg-white px-4 py-3 text-base outline-none"
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-[var(--ink-primary)]">次数</span>
                  <input
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={repsInput}
                    disabled={isSubmitting}
                    onChange={(event) => setRepsInput(event.target.value)}
                    className="w-full rounded-[1.15rem] border border-[var(--outline-soft)] bg-white px-4 py-3 text-base outline-none"
                  />
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
              >
                保存补录
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm leading-6 text-[var(--ink-secondary)]">
            还没有组记录。完成一组后，系统会自动在这里展示最近一组并允许你补录重量和次数。
          </p>
        )}
      </BottomSheet>

      <Snackbar message={snackbarMessage} />
    </div>
  )
}
