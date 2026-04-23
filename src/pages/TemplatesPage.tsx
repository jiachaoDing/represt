import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { BottomSheet } from '../components/ui/BottomSheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FloatingActionButton } from '../components/ui/FloatingActionButton'
import { PageHeader } from '../components/ui/PageHeader'
import { Snackbar } from '../components/ui/Snackbar'
import { SwipeActionItem } from '../components/ui/SwipeActionItem'
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

  const deleteExercise = useMemo(
    () => currentTemplate?.exercises.find((exercise) => exercise.id === deleteExerciseId) ?? null,
    [currentTemplate, deleteExerciseId],
  )

  function openTemplateSheet(mode: TemplateSheetMode) {
    if (mode === 'rename') {
      setRenameTemplateName(currentTemplate?.name ?? '')
    } else if (mode === 'create') {
      setNewTemplateName('')
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

  return (
    <div className="pb-4">
      <PageHeader title="模板管理" />

      {/* Filter chips array */}
      <div className="mt-2 -mx-4 overflow-x-auto px-4 scrollbar-hide">
        <div className="flex items-center gap-2 pb-2 w-max">
          {templates.map((template) => {
            const isSelected = template.id === selectedTemplateId
            return (
              <button
                key={template.id}
                onClick={() => setSelectedTemplateId(template.id)}
                disabled={isSubmitting}
                className={[
                  'flex items-center justify-center h-8 px-4 rounded-lg text-sm font-medium transition-colors whitespace-nowrap tap-highlight-transparent',
                  isSelected 
                    ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]' 
                    : 'border border-[var(--outline)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container)]'
                ].join(' ')}
              >
                {template.name}
              </button>
            )
          })}
          
          {/* Create Template Action Chip */}
          <button
            onClick={() => openTemplateSheet('create')}
            disabled={isSubmitting}
            className="flex items-center justify-center h-8 px-3 rounded-lg border border-[var(--outline-variant)] text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors whitespace-nowrap tap-highlight-transparent"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            新增
          </button>
        </div>
      </div>

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      <section className="mt-4">
        {isLoading ? (
          <div className="space-y-0">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-[4.5rem] border-b border-[var(--outline-variant)] bg-[var(--surface-container)] opacity-50 animate-pulse"
              />
            ))}
          </div>
        ) : null}

        {!isLoading && templates.length === 0 ? (
          <div className="mx-4 rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center mt-6">
            <p className="text-sm font-medium text-[var(--on-surface-variant)]">还没有创建任何模板</p>
            <button
              type="button"
              onClick={() => openTemplateSheet('create')}
              className="mt-4 inline-flex items-center text-sm font-medium text-[var(--primary)]"
            >
              新建模板
            </button>
          </div>
        ) : null}

        {!isLoading && currentTemplate ? (
          <>
            {/* Contextual Action Bar */}
            <div className="flex items-center justify-between mb-4 border-b border-[var(--outline-variant)] pb-3">
              <div className="flex-1 flex items-center gap-2">
                <button
                  onClick={() => openTemplateSheet('rename')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors tap-highlight-transparent"
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  编辑名称
                </button>
              </div>
              <button
                onClick={() => setTemplateDeleteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--error)] hover:bg-[var(--error)]/10 transition-colors tap-highlight-transparent"
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                删除模板
              </button>
            </div>

            {currentTemplate.exercises.length === 0 ? (
              <div className="mx-4 rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center mt-6">
                <p className="text-sm font-medium text-[var(--on-surface-variant)]">这个模板还没有动作</p>
                <button
                  type="button"
                  onClick={openCreateExerciseSheet}
                  className="mt-4 inline-flex items-center text-sm font-medium text-[var(--primary)]"
                >
                  添加动作
                </button>
              </div>
            ) : (
              <div className="flex flex-col border-y border-[var(--outline-variant)]">
                {currentTemplate.exercises.map((exercise, index) => (
                  <SwipeActionItem
                    key={exercise.id}
                    actionLabel="删除"
                    disabled={isSubmitting}
                    onAction={() => setDeleteExerciseId(exercise.id)}
                  >
                    <button
                      type="button"
                      onClick={() => openEditExerciseSheet(exercise.id)}
                      className={`block w-full text-left bg-[var(--surface)] px-4 py-4 ${index !== 0 ? 'border-t border-[var(--outline-variant)]' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <svg viewBox="0 0 24 24" width="20" height="20" className="text-[var(--outline)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="9" cy="12" r="1"></circle><circle cx="9" cy="5" r="1"></circle><circle cx="9" cy="19" r="1"></circle><circle cx="15" cy="12" r="1"></circle><circle cx="15" cy="5" r="1"></circle><circle cx="15" cy="19" r="1"></circle>
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-normal text-[var(--on-surface)]">
                            {exercise.name}
                          </p>
                          <p className="mt-0.5 text-sm text-[var(--on-surface-variant)]">
                            {exercise.targetSets} 组 · 休息 {exercise.restSeconds} 秒
                          </p>
                          <p className="mt-0.5 text-xs text-[var(--outline)]">
                            {getWeightLabel(exercise.weightKg ?? null)} · {getRepsLabel(exercise.reps ?? null)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </SwipeActionItem>
                ))}
              </div>
            )}
          </>
        ) : null}
      </section>

      {currentTemplate ? (
        <FloatingActionButton onClick={openCreateExerciseSheet} />
      ) : null}

      <BottomSheet
        open={templateSheetMode !== null}
        title={templateSheetMode === 'create' ? '新增模板' : '编辑名称'}
        onClose={() => setTemplateSheetMode(null)}
      >
        <form className="space-y-5 mt-2" onSubmit={handleTemplateSubmit}>
          <label className="block">
            <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">模板名称</span>
            <input
              value={templateSheetMode === 'create' ? newTemplateName : renameTemplateName}
              disabled={isSubmitting}
              onChange={(event) =>
                templateSheetMode === 'create'
                  ? setNewTemplateName(event.target.value)
                  : setRenameTemplateName(event.target.value)
              }
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
              placeholder="例如：推胸日"
            />
          </label>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || (templateSheetMode === 'create' ? !newTemplateName.trim() : !renameTemplateName.trim())}
              className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] disabled:opacity-40 transition-opacity"
            >
              {templateSheetMode === 'create' ? '创建模板' : '保存'}
            </button>
          </div>
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
          <form className="space-y-5 mt-2" onSubmit={handleExerciseSubmit}>
            <label className="block">
              <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">动作名称</span>
              <input
                value={exerciseDraft.name}
                disabled={isSubmitting}
                onChange={(event) =>
                  setExerciseDraft((current) => ({ ...current, name: event.target.value }))
                }
                className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
                placeholder="例如：杠铃卧推"
              />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">默认组数</span>
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
                  className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">休息秒数</span>
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
                  className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
                />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">默认重量 (kg)</span>
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
                  className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
                  placeholder="可选"
                />
              </label>

              <label className="block">
                <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">默认次数</span>
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
                  className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
                  placeholder="可选"
                />
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !exerciseDraft.name.trim()}
                className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] disabled:opacity-40 transition-opacity"
              >
                {editExerciseId ? '保存' : '添加动作'}
              </button>
            </div>
          </form>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={deleteExercise !== null}
        title="删除动作？"
        description={deleteExercise ? `确定从模板中删除“${deleteExercise.name}”吗？` : ''}
        confirmLabel="删除"
        danger
        onCancel={() => setDeleteExerciseId(null)}
        onConfirm={() => void handleConfirmDeleteExercise()}
      />

      <ConfirmDialog
        open={templateDeleteOpen && currentTemplate !== null}
        title="删除模板？"
        description={
          currentTemplate ? `确定删除“${currentTemplate.name}”吗？该操作无法恢复。` : ''
        }
        confirmLabel="删除"
        danger
        onCancel={() => setTemplateDeleteOpen(false)}
        onConfirm={() => void handleConfirmDeleteTemplate()}
      />

      <Snackbar message={snackbarMessage} />
    </div>
  )
}
