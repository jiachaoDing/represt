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
    currentSession,
    error,
    handleAddTemporaryExercise,
    handleAddTemplateExercises,
    handleDeleteExercise,
    hasTemplates,
    isLoading,
    isSubmitting,
    newExerciseDraft,
    selectedTemplateId,
    setNewExerciseDraft,
    setSelectedTemplateId,
    templates,
  } = useSchedulePageData()
  const [actionExerciseId, setActionExerciseId] = useState<string | null>(null)
  const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false)
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
  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedTemplateId) ?? null,
    [selectedTemplateId, templates],
  )

  function canDeleteExercise(exerciseId: string) {
    const exercise = currentSession?.exercises.find((item) => item.id === exerciseId)
    return Boolean(
      currentSession &&
        exercise &&
        exercise.status === 'pending' &&
        exercise.completedSets === 0,
    )
  }

  async function handleImportTemplate() {
    if (!selectedTemplateId) {
      return
    }

    const result = await handleAddTemplateExercises(selectedTemplateId)
    if (result) {
      setIsTemplateSheetOpen(false)
      setSnackbarMessage(`已把 ${result.name} 的 ${result.count} 个动作加入今日训练`)
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
        title="今日训练"
        eyebrow="TrainRe"
        subtitle="今天练什么，只看今天的动作列表。"
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
                  快捷加入动作集合
                </p>
                <p className="mt-1 text-xs text-[var(--ink-secondary)]">
                  模板只是默认动作集合，不会替换今天已经在练的内容。
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
              disabled: isSubmitting,
              id: template.id,
              label: template.name,
              meta: `${template.exercises.length} 个动作`,
            }))}
            selectedId={selectedTemplateId}
            onSelect={(templateId) => {
              setSelectedTemplateId(templateId)
              setIsTemplateSheetOpen(true)
            }}
          />

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--outline-soft)] px-4 py-3 text-xs text-[var(--ink-secondary)]">
            <StatusPill value={`${currentSession?.exercises.length ?? 0} 个今日动作`} />
            <span>点一个模板，预览后加入今日训练；手动新增动作依然独立存在。</span>
          </div>
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-[var(--outline-soft)] bg-[var(--surface)] px-5 py-6 shadow-[var(--shadow-soft)]">
          <p className="text-base font-semibold text-[var(--ink-primary)]">还没有动作集合模板</p>
          <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
            今天的训练仍然可以直接手动加动作。模板只是为了更快把一组常用动作带进今天的列表。
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
            <p className="text-sm font-medium text-[var(--ink-primary)]">今天还没有动作</p>
            <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
              可以直接用右下角 FAB 新增动作，也可以从上面的模板里把一组默认动作加入今天。
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
        description="手动新增的动作只加入今天，不回写模板。"
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
            添加到今日训练
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
                这个动作已经开始，不能再删除。
              </p>
            )}
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={isTemplateSheetOpen && selectedTemplate !== null}
        title={selectedTemplate?.name ?? '模板'}
        description="先看清这组动作，再决定是否加入今天的训练。"
        onClose={() => setIsTemplateSheetOpen(false)}
      >
        {selectedTemplate ? (
          <div className="space-y-4">
            <div className="rounded-[1.25rem] bg-[rgba(24,32,22,0.04)] px-4 py-3 text-sm text-[var(--ink-secondary)]">
              共 {selectedTemplate.exercises.length} 个动作，加入后会追加到今日训练列表，不会覆盖现有动作。
            </div>

            <div className="space-y-3">
              {selectedTemplate.exercises.map((exercise) => (
                <div
                  key={exercise.id}
                  className="rounded-[1.25rem] border border-[var(--outline-soft)] bg-white px-4 py-3"
                >
                  <p className="text-sm font-medium text-[var(--ink-primary)]">{exercise.name}</p>
                  <p className="mt-1 text-xs text-[var(--ink-secondary)]">
                    {exercise.targetSets} 组 · 休息 {exercise.restSeconds} 秒
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => void handleImportTemplate()}
              className="w-full rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              加入今日训练
            </button>
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={deleteExercise !== null}
        title="删除动作？"
        description={
          deleteExercise
            ? `“${deleteExercise.name}” 只会从今日训练移除，不会回写模板。`
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
