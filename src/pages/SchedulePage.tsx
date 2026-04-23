import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { BottomSheet } from '../components/ui/BottomSheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FloatingActionButton } from '../components/ui/FloatingActionButton'
import { OverflowMenu } from '../components/ui/OverflowMenu'
import { PageHeader } from '../components/ui/PageHeader'
import { Snackbar } from '../components/ui/Snackbar'
import { StatusPill } from '../components/ui/StatusPill'
import { SwipeActionItem } from '../components/ui/SwipeActionItem'
import { TemplateTabs } from '../components/ui/TemplateTabs'
import { useNow } from '../hooks/useNow'
import { useSchedulePageData } from '../hooks/pages/useSchedulePageData'
import { getExerciseRestLabel, getSessionStatusLabel } from '../lib/session-display'

function getSessionTone(status: 'active' | 'completed' | 'pending') {
  if (status === 'completed') {
    return 'positive' as const
  }

  if (status === 'active') {
    return 'neutral' as const
  }

  return 'neutral' as const
}

export function SchedulePage() {
  const now = useNow()
  const navigate = useNavigate()
  const {
    canAddTemporaryExercise,
    canChangeTemplate,
    currentSession,
    currentTemplate,
    error,
    handleAddTemporaryExercise,
    handleDeleteExercise,
    handleSelectTemplate,
    hasTemplates,
    isLoading,
    isSubmitting,
    newExerciseDraft,
    selectedTemplateId,
    setNewExerciseDraft,
    templates,
  } = useSchedulePageData()
  const [actionExerciseId, setActionExerciseId] = useState<string | null>(null)
  const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!snackbarMessage) {
      return
    }

    const timer = window.setTimeout(() => setSnackbarMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [snackbarMessage])

  const actionExercise = useMemo(
    () => currentSession?.exercises.find((exercise) => exercise.id === actionExerciseId) ?? null,
    [actionExerciseId, currentSession],
  )
  const deleteExercise = useMemo(
    () => currentSession?.exercises.find((exercise) => exercise.id === deleteExerciseId) ?? null,
    [currentSession, deleteExerciseId],
  )

  function canDeleteExercise(exerciseId: string) {
    const exercise = currentSession?.exercises.find((item) => item.id === exerciseId)
    return Boolean(
      currentSession &&
        currentSession.status === 'pending' &&
        exercise &&
        exercise.status === 'pending' &&
        exercise.completedSets === 0,
    )
  }

  async function handleTemplateChange(templateId: string) {
    const nextTemplateName = await handleSelectTemplate(templateId)
    if (nextTemplateName) {
      setSnackbarMessage(`已切换到 ${nextTemplateName}`)
    }
  }

  async function handleAddExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const didCreate = await handleAddTemporaryExercise()

    if (didCreate) {
      setIsCreateSheetOpen(false)
      setSnackbarMessage('动作已加入本次训练')
    }
  }

  async function handleConfirmDelete() {
    if (!deleteExerciseId) {
      return
    }

    const didDelete = await handleDeleteExercise(deleteExerciseId)
    if (didDelete) {
      setDeleteExerciseId(null)
      setActionExerciseId(null)
      setSnackbarMessage('动作已删除')
    }
  }

  const overflowItems = [
    {
      label: '编辑模板',
      onSelect: () => navigate('/templates'),
    },
    ...(currentSession?.status === 'completed'
      ? [
          {
            label: '查看总结',
            onSelect: () => navigate(`/summary/${currentSession.id}`),
          },
        ]
      : []),
  ]

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="训练安排"
        eyebrow="TrainRe"
        subtitle="选模板后直接进入当前训练列表。"
        actions={<OverflowMenu items={overflowItems} />}
      />

      {error ? (
        <div className="rounded-[1.25rem] border border-[var(--surface-danger)] bg-[rgba(255,218,214,0.65)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {hasTemplates ? (
        <section className="overflow-hidden rounded-[1.75rem] border border-[var(--outline-soft)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--ink-primary)]">
                  {currentSession?.templateName ?? currentTemplate?.name ?? '模板'}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-secondary)]">
                  左右滑动切换模板，当前训练内容随模板切换。
                </p>
              </div>
              {currentSession ? (
                <StatusPill
                  tone={getSessionTone(currentSession.status)}
                  value={getSessionStatusLabel(currentSession.status)}
                />
              ) : null}
            </div>
          </div>

          <TemplateTabs
            items={templates.map((template) => ({
              disabled: isSubmitting || (!canChangeTemplate && template.id !== selectedTemplateId),
              id: template.id,
              label: template.name,
              meta: `${template.exercises.length} 个动作`,
            }))}
            selectedId={selectedTemplateId}
            onSelect={(templateId) => void handleTemplateChange(templateId)}
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--outline-soft)] px-4 py-3 text-xs text-[var(--ink-secondary)]">
            <StatusPill
              value={`${currentSession?.exercises.length ?? currentTemplate?.exercises.length ?? 0} 个动作`}
            />
            {canChangeTemplate ? (
              <span>训练未开始时，切换模板会直接替换下方动作列表。</span>
            ) : (
              <span>训练进行中后模板锁定，避免误切换当前训练。</span>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-[var(--outline-soft)] bg-[var(--surface)] px-5 py-6 shadow-[var(--shadow-soft)]">
          <p className="text-base font-semibold text-[var(--ink-primary)]">还没有训练模板</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
            先创建一个模板，训练安排页会直接围绕当前模板展开，不再出现额外的创建训练步骤。
          </p>
          <Link
            to="/templates"
            className="mt-4 inline-flex rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white"
          >
            去创建模板
          </Link>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-base font-semibold text-[var(--ink-primary)]">动作列表</p>
            <p className="mt-1 text-sm text-[var(--ink-secondary)]">
              点击进入动作页，左滑删除未开始动作，长按打开上下文菜单。
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[5.25rem] rounded-[1.5rem] border border-[var(--outline-soft)] bg-[rgba(255,255,255,0.7)]"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && currentSession?.exercises.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-[var(--outline-strong)] bg-[rgba(255,255,255,0.45)] px-5 py-6">
            <p className="text-sm font-medium text-[var(--ink-primary)]">当前训练还没有动作</p>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
              用右下角 FAB 添加临时动作，保持页面主区域只聚焦现有训练内容。
            </p>
          </div>
        ) : null}

        {!isLoading && currentSession ? (
          <div className="space-y-3">
            {currentSession.exercises.map((exercise) => {
              const canDelete = canDeleteExercise(exercise.id)

              return (
                <SwipeActionItem
                  key={exercise.id}
                  actionLabel="删除"
                  disabled={!canDelete}
                  onAction={() => setDeleteExerciseId(exercise.id)}
                  onLongPress={() => setActionExerciseId(exercise.id)}
                >
                  <Link
                    to={`/exercise/${exercise.id}`}
                    className="block rounded-[1.5rem] border border-[var(--outline-soft)] bg-[var(--surface-raised)] px-4 py-4 shadow-[var(--shadow-soft)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-[var(--ink-primary)]">
                          {exercise.name}
                        </p>
                        <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                          {exercise.completedSets} / {exercise.targetSets} 组 · 休息 {exercise.restSeconds} 秒
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-medium text-[var(--brand-strong)]">
                          {getExerciseRestLabel(exercise, now)}
                        </p>
                        <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
                          {canDelete ? '可左滑删除' : '点击继续训练'}
                        </p>
                      </div>
                    </div>
                  </Link>
                </SwipeActionItem>
              )
            })}
          </div>
        ) : null}
      </section>

      {canAddTemporaryExercise ? (
        <FloatingActionButton label="新增动作" onClick={() => setIsCreateSheetOpen(true)} />
      ) : null}

      <BottomSheet
        open={isCreateSheetOpen}
        title="新增动作"
        description="临时动作只加入本次训练，不回写模板。"
        onClose={() => setIsCreateSheetOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleAddExercise}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--ink-primary)]">动作名</span>
            <input
              value={newExerciseDraft.name}
              disabled={isSubmitting}
              onChange={(event) =>
                setNewExerciseDraft((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded-[1.15rem] border border-[var(--outline-soft)] bg-white px-4 py-3 text-base outline-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--ink-primary)]">组数</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={newExerciseDraft.targetSets}
                disabled={isSubmitting}
                onChange={(event) =>
                  setNewExerciseDraft((current) => ({
                    ...current,
                    targetSets: event.target.value,
                  }))
                }
                className="w-full rounded-[1.15rem] border border-[var(--outline-soft)] bg-white px-4 py-3 text-base outline-none"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--ink-primary)]">休息秒数</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={newExerciseDraft.restSeconds}
                disabled={isSubmitting}
                onChange={(event) =>
                  setNewExerciseDraft((current) => ({
                    ...current,
                    restSeconds: event.target.value,
                  }))
                }
                className="w-full rounded-[1.15rem] border border-[var(--outline-soft)] bg-white px-4 py-3 text-base outline-none"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            添加到本次训练
          </button>
        </form>
      </BottomSheet>

      <BottomSheet
        open={actionExercise !== null}
        title={actionExercise?.name ?? '动作'}
        description="把低频操作放到上下文层，避免每一项常驻一排按钮。"
        onClose={() => setActionExerciseId(null)}
      >
        {actionExercise ? (
          <div className="space-y-3">
            <div className="rounded-[1.25rem] bg-[rgba(24,32,22,0.04)] px-4 py-3 text-sm text-[var(--ink-secondary)]">
              {actionExercise.completedSets} / {actionExercise.targetSets} 组 · 休息{' '}
              {actionExercise.restSeconds} 秒
            </div>
            {canDeleteExercise(actionExercise.id) ? (
              <button
                type="button"
                onClick={() => setDeleteExerciseId(actionExercise.id)}
                className="w-full rounded-full bg-[var(--danger)] px-4 py-3 text-sm font-medium text-white"
              >
                删除这个动作
              </button>
            ) : (
              <p className="text-sm leading-6 text-[var(--ink-secondary)]">
                这个动作已经开始或训练已锁定，不能再删除。
              </p>
            )}
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={deleteExercise !== null}
        title="删除动作？"
        description={
          deleteExercise
            ? `“${deleteExercise.name}” 只会从本次训练移除，不会回写模板。`
            : ''
        }
        confirmLabel="删除"
        danger
        onCancel={() => setDeleteExerciseId(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      <Snackbar message={snackbarMessage} />
    </div>
  )
}
