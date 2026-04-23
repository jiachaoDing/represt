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
import { useTemplatesPageData } from '../hooks/pages/useTemplatesPageData'
import { getRepsLabel, getWeightLabel } from '../lib/session-display'
import {
  emptyTemplateExerciseDraft,
  toTemplateExerciseDraft,
  type TemplateExerciseDraft,
} from '../lib/template-editor'

type TemplateSheetMode = 'create' | 'rename' | null

export function TemplatesPage() {
  const {
    currentTemplate,
    error,
    handleCreateExercise,
    handleCreateTemplate,
    handleDeleteExercise,
    handleDeleteTemplate,
    handleSaveExercise,
    handleSaveTemplateName,
    isLoading,
    isSubmitting,
    newTemplateName,
    selectedTemplateId,
    setNewTemplateName,
    setSelectedTemplateId,
    templates,
  } = useTemplatesPageData()
  const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null)
  const [editExerciseId, setEditExerciseId] = useState<string | null>(null)
  const [exerciseActionId, setExerciseActionId] = useState<string | null>(null)
  const [exerciseDraft, setExerciseDraft] = useState<TemplateExerciseDraft>(emptyTemplateExerciseDraft)
  const [isExerciseSheetOpen, setIsExerciseSheetOpen] = useState(false)
  const [renameTemplateName, setRenameTemplateName] = useState('')
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)
  const [templateDeleteOpen, setTemplateDeleteOpen] = useState(false)
  const [templateSheetMode, setTemplateSheetMode] = useState<TemplateSheetMode>(null)

  useEffect(() => {
    if (!snackbarMessage) {
      return
    }

    const timer = window.setTimeout(() => setSnackbarMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [snackbarMessage])

  const editingExercise = useMemo(
    () => currentTemplate?.exercises.find((exercise) => exercise.id === editExerciseId) ?? null,
    [currentTemplate, editExerciseId],
  )
  const actionExercise = useMemo(
    () => currentTemplate?.exercises.find((exercise) => exercise.id === exerciseActionId) ?? null,
    [currentTemplate, exerciseActionId],
  )
  const deleteExercise = useMemo(
    () => currentTemplate?.exercises.find((exercise) => exercise.id === deleteExerciseId) ?? null,
    [currentTemplate, deleteExerciseId],
  )

  function openTemplateSheet(mode: TemplateSheetMode) {
    if (mode === 'rename') {
      setRenameTemplateName(currentTemplate?.name ?? '')
    }

    setTemplateSheetMode(mode)
  }

  function openCreateExerciseSheet() {
    setEditExerciseId(null)
    setExerciseDraft(emptyTemplateExerciseDraft)
    setIsExerciseSheetOpen(true)
  }

  function openEditExerciseSheet(exerciseId: string) {
    const exercise = currentTemplate?.exercises.find((item) => item.id === exerciseId)
    if (!exercise) {
      return
    }

    setEditExerciseId(exercise.id)
    setExerciseDraft(toTemplateExerciseDraft(exercise))
    setIsExerciseSheetOpen(true)
  }

  async function handleTemplateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (templateSheetMode === 'create') {
      const didCreate = await handleCreateTemplate()
      if (didCreate) {
        setTemplateSheetMode(null)
        setSnackbarMessage('模板已创建')
      }
      return
    }

    if (templateSheetMode === 'rename' && currentTemplate) {
      const didRename = await handleSaveTemplateName(currentTemplate.id, renameTemplateName)
      if (didRename) {
        setTemplateSheetMode(null)
        setSnackbarMessage('模板名称已更新')
      }
    }
  }

  async function handleExerciseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!currentTemplate) {
      return
    }

    if (!editExerciseId) {
      const didCreate = await handleCreateExercise(currentTemplate.id, exerciseDraft)
      if (didCreate) {
        setIsExerciseSheetOpen(false)
        setExerciseDraft(emptyTemplateExerciseDraft)
        setSnackbarMessage('动作已加入模板')
      }
      return
    }

    const didSave = await handleSaveExercise(currentTemplate.id, editExerciseId, exerciseDraft)
    if (didSave) {
      setIsExerciseSheetOpen(false)
      setSnackbarMessage('动作已更新')
    }
  }

  async function handleConfirmDeleteExercise() {
    if (!currentTemplate || !deleteExerciseId) {
      return
    }

    const didDelete = await handleDeleteExercise(currentTemplate.id, deleteExerciseId)
    if (didDelete) {
      setDeleteExerciseId(null)
      setExerciseActionId(null)
      setEditExerciseId(null)
      setIsExerciseSheetOpen(false)
      setSnackbarMessage('动作已删除')
    }
  }

  async function handleConfirmDeleteTemplate() {
    if (!currentTemplate) {
      return
    }

    const didDelete = await handleDeleteTemplate(currentTemplate.id)
    if (didDelete) {
      setTemplateDeleteOpen(false)
      setTemplateSheetMode(null)
      setEditExerciseId(null)
      setSnackbarMessage('模板已删除')
    }
  }

  const overflowItems = [
    {
      label: '新增模板',
      onSelect: () => openTemplateSheet('create'),
    },
    {
      disabled: !currentTemplate,
      label: '重命名模板',
      onSelect: () => openTemplateSheet('rename'),
    },
    {
      danger: true,
      disabled: !currentTemplate,
      label: '删除模板',
      onSelect: () => setTemplateDeleteOpen(true),
    },
  ]

  return (
    <div className="space-y-4 pb-4">
      <PageHeader
        title="模板编辑"
        eyebrow="TrainRe"
        actions={<OverflowMenu items={overflowItems} />}
      />

      {error ? (
        <div className="rounded-[1.25rem] border border-[var(--surface-danger)] bg-[rgba(255,218,214,0.65)] px-4 py-3 text-sm text-[var(--danger)]">
          {error}
        </div>
      ) : null}

      {templates.length > 0 ? (
        <section className="overflow-hidden rounded-[1.75rem] border border-[var(--outline-soft)] bg-[var(--surface)] shadow-[var(--shadow-soft)]">
          <div className="px-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[var(--ink-primary)]">
                  {currentTemplate?.name ?? '当前模板'}
                </p>
              </div>
              <StatusPill value={`${currentTemplate?.exercises.length ?? 0} 个动作`} />
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
            onSelect={setSelectedTemplateId}
          />
        </section>
      ) : (
        <section className="rounded-[1.75rem] border border-dashed border-[var(--outline-strong)] bg-[rgba(255,255,255,0.45)] px-5 py-6">
          <p className="text-base font-semibold text-[var(--ink-primary)]">先创建一个模板</p>
          <button
            type="button"
            onClick={() => openTemplateSheet('create')}
            className="mt-4 inline-flex rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white"
          >
            新增模板
          </button>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between px-1">
          <div>
            <p className="text-base font-semibold text-[var(--ink-primary)]">模板动作</p>
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

        {!isLoading && currentTemplate && currentTemplate.exercises.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-[var(--outline-strong)] bg-[rgba(255,255,255,0.45)] px-5 py-6">
            <p className="text-sm font-medium text-[var(--ink-primary)]">这个模板还没有动作</p>
          </div>
        ) : null}

        {!isLoading && currentTemplate ? (
          <div className="space-y-3">
            {currentTemplate.exercises.map((exercise) => (
              <SwipeActionItem
                key={exercise.id}
                actionLabel="删除"
                disabled={isSubmitting}
                onAction={() => setDeleteExerciseId(exercise.id)}
                onLongPress={() => setExerciseActionId(exercise.id)}
              >
                <button
                  type="button"
                  onClick={() => openEditExerciseSheet(exercise.id)}
                  className="block w-full rounded-[1.5rem] border border-[var(--outline-soft)] bg-[var(--surface-raised)] px-4 py-4 text-left shadow-[var(--shadow-soft)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-[var(--ink-primary)]">
                        {exercise.name}
                      </p>
                      <p className="mt-1 text-sm text-[var(--ink-secondary)]">
                        默认 {exercise.targetSets} 组 · 休息 {exercise.restSeconds} 秒
                      </p>
                      <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
                        {getWeightLabel(exercise.weightKg ?? null)} · {getRepsLabel(exercise.reps ?? null)}
                      </p>
                    </div>
                  </div>
                </button>
              </SwipeActionItem>
            ))}
          </div>
        ) : null}
      </section>

      {currentTemplate ? (
        <FloatingActionButton label="新增动作" onClick={openCreateExerciseSheet} />
      ) : null}

      <BottomSheet
        open={templateSheetMode !== null}
        title={templateSheetMode === 'create' ? '新增模板' : '重命名模板'}
        onClose={() => setTemplateSheetMode(null)}
      >
        <form className="space-y-4" onSubmit={handleTemplateSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--ink-primary)]">模板名称</span>
            <input
              value={templateSheetMode === 'create' ? newTemplateName : renameTemplateName}
              disabled={isSubmitting}
              onChange={(event) =>
                templateSheetMode === 'create'
                  ? setNewTemplateName(event.target.value)
                  : setRenameTemplateName(event.target.value)
              }
              className="w-full rounded-[1.15rem] border border-[var(--outline-soft)] bg-white px-4 py-3 text-base outline-none"
            />
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
          >
            {templateSheetMode === 'create' ? '创建模板' : '保存名称'}
          </button>
        </form>
      </BottomSheet>

      <BottomSheet
        open={currentTemplate !== null && isExerciseSheetOpen}
        title={editExerciseId ? '编辑动作' : '新增动作'}
        onClose={() => {
          setEditExerciseId(null)
          setExerciseDraft(emptyTemplateExerciseDraft)
          setIsExerciseSheetOpen(false)
        }}
      >
        {currentTemplate ? (
          <form className="space-y-4" onSubmit={handleExerciseSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--ink-primary)]">动作名</span>
              <input
                value={exerciseDraft.name}
                disabled={isSubmitting}
                onChange={(event) =>
                  setExerciseDraft((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-[1.15rem] border border-[var(--outline-soft)] bg-white px-4 py-3 text-base outline-none"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink-primary)]">默认组数</span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={exerciseDraft.targetSets}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setExerciseDraft((current) => ({
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
                  value={exerciseDraft.restSeconds}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setExerciseDraft((current) => ({
                      ...current,
                      restSeconds: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.15rem] border border-[var(--outline-soft)] bg-white px-4 py-3 text-base outline-none"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink-primary)]">默认重量 (kg)</span>
                <input
                  type="number"
                  min={0}
                  step="0.5"
                  inputMode="decimal"
                  value={exerciseDraft.weightKg}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setExerciseDraft((current) => ({
                      ...current,
                      weightKg: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.15rem] border border-[var(--outline-soft)] bg-white px-4 py-3 text-base outline-none"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-[var(--ink-primary)]">默认次数</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={exerciseDraft.reps}
                  disabled={isSubmitting}
                  onChange={(event) =>
                    setExerciseDraft((current) => ({
                      ...current,
                      reps: event.target.value,
                    }))
                  }
                  className="w-full rounded-[1.15rem] border border-[var(--outline-soft)] bg-white px-4 py-3 text-base outline-none"
                />
              </label>
            </div>

            {editingExercise ? (
              <div className="rounded-[1.25rem] bg-[rgba(24,32,22,0.04)] px-4 py-3 text-sm text-[var(--ink-secondary)]">
                当前编辑：{editingExercise.name}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-[var(--brand)] px-4 py-3 text-sm font-medium text-white disabled:opacity-40"
            >
              {editExerciseId ? '保存动作' : '添加动作'}
            </button>
          </form>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={actionExercise !== null}
        title={actionExercise?.name ?? '动作'}
        onClose={() => setExerciseActionId(null)}
      >
        {actionExercise ? (
          <div className="space-y-3">
            <div className="rounded-[1.25rem] bg-[rgba(24,32,22,0.04)] px-4 py-3 text-sm text-[var(--ink-secondary)]">
              默认 {actionExercise.targetSets} 组 · 休息 {actionExercise.restSeconds} 秒 ·{' '}
              {getWeightLabel(actionExercise.weightKg ?? null)} · {getRepsLabel(actionExercise.reps ?? null)}
            </div>
            <button
              type="button"
              onClick={() => setDeleteExerciseId(actionExercise.id)}
              className="w-full rounded-full bg-[var(--danger)] px-4 py-3 text-sm font-medium text-white"
            >
              删除这个动作
            </button>
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={deleteExercise !== null}
        title="删除动作？"
        description={deleteExercise ? `“${deleteExercise.name}”` : ''}
        confirmLabel="删除"
        danger
        onCancel={() => setDeleteExerciseId(null)}
        onConfirm={() => void handleConfirmDeleteExercise()}
      />

      <ConfirmDialog
        open={templateDeleteOpen && currentTemplate !== null}
        title="删除模板？"
        description={
          currentTemplate ? `“${currentTemplate.name}” 及其全部动作会被删除。` : ''
        }
        confirmLabel="删除模板"
        danger
        onCancel={() => setTemplateDeleteOpen(false)}
        onConfirm={() => void handleConfirmDeleteTemplate()}
      />

      <Snackbar message={snackbarMessage} />
    </div>
  )
}
