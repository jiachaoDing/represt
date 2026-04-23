import { Link } from 'react-router-dom'
import { useEffect, useMemo, useState, type FormEvent } from 'react'

import { BottomSheet } from '../components/ui/BottomSheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { FloatingActionButton } from '../components/ui/FloatingActionButton'
import { PageHeader } from '../components/ui/PageHeader'
import { Snackbar } from '../components/ui/Snackbar'
import { SwipeActionItem } from '../components/ui/SwipeActionItem'
import { useNow } from '../hooks/useNow'
import { useSchedulePageData } from '../hooks/pages/useSchedulePageData'
import {
  deriveExerciseStatus,
  getExerciseRestLabel,
} from '../lib/session-display'

export function SchedulePage() {
  const now = useNow()
  const {
    canAddTemporaryExercise,
    currentSession,
    error,
    getTemplateImportConfirmation,
    handleAddTemporaryExercise,
    handleAddTemplateExercises,
    handleDeleteExercise,
    hasTemplates,
    isLoading,
    isSubmitting,
    newExerciseDraft,
    setNewExerciseDraft,
    shouldConfirmContinueBeforeAddingExercise,
    templates,
  } = useSchedulePageData()
  
  const [isFabMenuOpen, setIsFabMenuOpen] = useState(false)
  const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null)
  const [isContinueExerciseDialogOpen, setIsContinueExerciseDialogOpen] = useState(false)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false)
  
  // Choose template to import
  const [importSourceTemplateId, setImportSourceTemplateId] = useState<string | null>(null)
  const [selectedTemplateExerciseIds, setSelectedTemplateExerciseIds] = useState<string[]>([])
  
  const [pendingTemplateImportId, setPendingTemplateImportId] = useState<string | null>(null)
  const [pendingTemplateExerciseIds, setPendingTemplateExerciseIds] = useState<string[]>([])
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!snackbarMessage) {
      return
    }
    const timer = window.setTimeout(() => setSnackbarMessage(null), 2200)
    return () => window.clearTimeout(timer)
  }, [snackbarMessage])

  const deleteExercise = useMemo(
    () => currentSession?.exercises.find((exercise) => exercise.id === deleteExerciseId) ?? null,
    [currentSession, deleteExerciseId],
  )
  
  const importSourceTemplate = useMemo(
    () => templates.find((template) => template.id === importSourceTemplateId) ?? null,
    [importSourceTemplateId, templates],
  )

  const pendingTemplateImportConfirmation = pendingTemplateImportId
    ? getTemplateImportConfirmation(pendingTemplateImportId, pendingTemplateExerciseIds)
    : null

  useEffect(() => {
    setSelectedTemplateExerciseIds(importSourceTemplate?.exercises.map((exercise) => exercise.id) ?? [])
  }, [importSourceTemplate])

  function toggleTemplateExercise(exerciseId: string) {
    setSelectedTemplateExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((id) => id !== exerciseId)
        : [...current, exerciseId],
    )
  }

  function canDeleteExercise(exerciseId: string) {
    const exercise = currentSession?.exercises.find((item) => item.id === exerciseId)
    return Boolean(
      currentSession &&
        exercise &&
        exercise.status === 'pending' &&
        exercise.completedSets === 0,
    )
  }

  function getTemplateImportConfirmDescription() {
    if (!pendingTemplateImportConfirmation) {
      return ''
    }

    const messages: string[] = []

    if (pendingTemplateImportConfirmation.isDuplicateImport) {
      messages.push(
        `“${pendingTemplateImportConfirmation.templateName}” 可能已加入过今日训练，继续会重复追加。`,
      )
    }

    if (pendingTemplateImportConfirmation.willContinueCompletedSession) {
      messages.push('会更新今日训练总结。')
    }

    return messages.join(' ')
  }

  async function importTemplate(templateId: string, templateExerciseIds: string[]) {
    const result = await handleAddTemplateExercises(templateId, templateExerciseIds)
    if (result) {
      setPendingTemplateImportId(null)
      setPendingTemplateExerciseIds([])
      setIsTemplateSheetOpen(false)
      setSnackbarMessage(`已把 ${result.name} 的 ${result.count} 个动作加入今日训练`)
    }
  }

  async function handleImportTemplate() {
    if (!importSourceTemplateId) {
      return
    }

    if (selectedTemplateExerciseIds.length === 0) {
      setSnackbarMessage('至少选择 1 个动作')
      return
    }

    if (getTemplateImportConfirmation(importSourceTemplateId, selectedTemplateExerciseIds)) {
      setPendingTemplateImportId(importSourceTemplateId)
      setPendingTemplateExerciseIds(selectedTemplateExerciseIds)
      return
    }

    await importTemplate(importSourceTemplateId, selectedTemplateExerciseIds)
  }

  async function addExercise() {
    const didCreate = await handleAddTemporaryExercise()

    if (didCreate) {
      setIsContinueExerciseDialogOpen(false)
      setIsCreateSheetOpen(false)
      setSnackbarMessage('动作已加入今日训练')
    }
  }

  async function handleAddExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (shouldConfirmContinueBeforeAddingExercise) {
      setIsContinueExerciseDialogOpen(true)
      return
    }

    await addExercise()
  }

  async function handleConfirmDelete() {
    if (!deleteExerciseId) {
      return
    }

    const didDelete = await handleDeleteExercise(deleteExerciseId)
    if (didDelete) {
      setDeleteExerciseId(null)
      setSnackbarMessage('动作已删除')
    }
  }

  const todayStr = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())
  const completedCount = currentSession?.exercises.filter(e => deriveExerciseStatus(e) === 'completed').length || 0
  const totalCount = currentSession?.exercises.length || 0

  return (
    <div className="pb-4">
      <PageHeader
        title={todayStr}
        subtitle={`${completedCount} / ${totalCount} 动作已完成`}
      />

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      <section className="mt-6">
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

        {!isLoading && currentSession?.exercises.length === 0 ? (
          <div className="mx-4 rounded-xl border border-dashed border-[var(--outline)] px-5 py-8 text-center">
            <p className="text-sm font-medium text-[var(--on-surface-variant)]">今天还没有动作</p>
            {hasTemplates ? (
              <button 
                className="mt-4 text-sm font-medium text-[var(--primary)]"
                onClick={() => setIsFabMenuOpen(true)}
              >
                从模板导入
              </button>
            ) : (
               <Link 
                 to="/templates"
                 className="mt-4 block text-sm font-medium text-[var(--primary)]"
               >
                 去创建模板
               </Link>
            )}
          </div>
        ) : null}

        {!isLoading && currentSession ? (
          <div className="flex flex-col border-y border-[var(--outline-variant)]">
            {currentSession.exercises.map((exercise, index) => {
              const canDelete = canDeleteExercise(exercise.id)
              const status = deriveExerciseStatus(exercise)
              
              let statusClasses = ''
              let iconNode = null
              
              if (status === 'completed') {
                statusClasses = 'border-l-4 border-l-[var(--primary)] bg-[var(--surface)]'
                iconNode = (
                  <svg viewBox="0 0 24 24" width="20" height="20" className="text-[var(--primary)] shrink-0" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                )
              } else if (status === 'active') {
                statusClasses = 'border-l-4 border-l-[var(--tertiary)] bg-[var(--tertiary-container)]'
                iconNode = (
                  <svg viewBox="0 0 24 24" width="20" height="20" className="text-[var(--tertiary)] shrink-0" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                  </svg>
                )
              } else {
                statusClasses = 'border-l-4 border-l-[var(--outline)] bg-[var(--surface)]'
                iconNode = (
                  <svg viewBox="0 0 24 24" width="20" height="20" className="text-[var(--outline-variant)] shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                )
              }

              return (
                <SwipeActionItem
                  key={exercise.id}
                  actionLabel="删除"
                  disabled={!canDelete}
                  onAction={() => setDeleteExerciseId(exercise.id)}
                >
                  <Link
                    to={`/exercise/${exercise.id}`}
                    className={`block w-full px-4 py-4 ${statusClasses} ${index !== 0 ? 'border-t border-t-[var(--outline-variant)]' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-base font-normal ${status === 'completed' ? 'text-[var(--outline)] line-through' : 'text-[var(--on-surface)]'}`}>
                          {exercise.name}
                        </p>
                        <p className={`mt-0.5 text-sm ${status === 'active' ? 'text-[var(--tertiary)] font-medium' : status === 'completed' ? 'text-[var(--outline)]' : 'text-[var(--on-surface-variant)]'}`}>
                          {status === 'active' ? getExerciseRestLabel(exercise, now) : `${exercise.completedSets} / ${exercise.targetSets} 组`}
                        </p>
                      </div>
                      {iconNode}
                    </div>
                  </Link>
                </SwipeActionItem>
              )
            })}
          </div>
        ) : null}
      </section>

      {canAddTemporaryExercise ? (
        <FloatingActionButton onClick={() => setIsFabMenuOpen(true)} />
      ) : null}

      <BottomSheet
        open={isFabMenuOpen}
        title="添加动作"
        onClose={() => setIsFabMenuOpen(false)}
      >
        <div className="space-y-1">
          {hasTemplates && templates.length > 0 ? (
            templates.map((template) => (
              <button
                key={template.id}
                onClick={() => {
                  setImportSourceTemplateId(template.id)
                  setIsFabMenuOpen(false)
                  setIsTemplateSheetOpen(true)
                }}
                className="w-full flex items-center justify-between px-4 py-4 rounded-xl text-left hover:bg-[var(--surface-container)] transition-colors"
              >
                <span className="text-[var(--on-surface)] text-base font-medium">导入 {template.name}</span>
                <span className="text-[var(--on-surface-variant)] text-sm">{template.exercises.length} 个动作</span>
              </button>
            ))
          ) : null}
          <div className="my-2 border-t border-[var(--outline-variant)]" />
          <button
            onClick={() => {
              setIsFabMenuOpen(false)
              setIsCreateSheetOpen(true)
            }}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-xl text-left hover:bg-[var(--surface-container)] transition-colors"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--on-surface)]">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="text-[var(--on-surface)] text-base font-medium">手动新建动作</span>
          </button>
        </div>
      </BottomSheet>

      <BottomSheet
        open={isCreateSheetOpen}
        title="手动新建动作"
        onClose={() => setIsCreateSheetOpen(false)}
      >
        <form className="space-y-5 mt-2" onSubmit={handleAddExercise}>
          <label className="block">
            <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">动作名称</span>
            <input
              value={newExerciseDraft.name}
              disabled={isSubmitting}
              onChange={(event) =>
                setNewExerciseDraft((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
              placeholder="例如：杠铃卧推"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">组数</span>
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
                className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-medium text-[var(--on-surface-variant)] mb-1 ml-1">休息秒数</span>
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
                className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none focus:border-b-2 focus:border-[var(--primary)] transition-all"
              />
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !newExerciseDraft.name.trim()}
              className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] disabled:opacity-40 transition-opacity"
            >
              添加到今日训练
            </button>
          </div>
        </form>
      </BottomSheet>

      <BottomSheet
        open={isTemplateSheetOpen && importSourceTemplate !== null}
        title={importSourceTemplate?.name ?? '模板'}
        onClose={() => setIsTemplateSheetOpen(false)}
      >
        {importSourceTemplate ? (
          <div className="space-y-4">
            <p className="text-sm text-[var(--on-surface-variant)] px-1">
              选择要导入的动作 ({selectedTemplateExerciseIds.length} / {importSourceTemplate.exercises.length})
            </p>

            <div className="max-h-[50vh] overflow-y-auto space-y-1 -mx-2 px-2">
              {importSourceTemplate.exercises.map((exercise) => (
                <label
                  key={exercise.id}
                  className="flex items-center gap-4 rounded-xl px-2 py-3 hover:bg-[var(--surface-container)] transition-colors cursor-pointer"
                >
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <input
                      type="checkbox"
                      checked={selectedTemplateExerciseIds.includes(exercise.id)}
                      disabled={isSubmitting}
                      onChange={() => toggleTemplateExercise(exercise.id)}
                      className="peer appearance-none w-5 h-5 rounded-sm border-2 border-[var(--outline)] checked:border-[var(--primary)] checked:bg-[var(--primary)] transition-all shrink-0"
                    />
                    <svg viewBox="0 0 24 24" className="absolute w-4 h-4 text-[var(--on-primary)] pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-base text-[var(--on-surface)]">{exercise.name}</p>
                    <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">
                      {exercise.targetSets} 组 · 休息 {exercise.restSeconds} 秒
                    </p>
                  </div>
                </label>
              ))}
            </div>

            {selectedTemplateExerciseIds.length === 0 ? (
              <p className="text-sm text-[var(--error)]">必须至少选择 1 个动作</p>
            ) : null}

            <div className="pt-2">
              <button
                type="button"
                disabled={isSubmitting || selectedTemplateExerciseIds.length === 0}
                onClick={() => void handleImportTemplate()}
                className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] disabled:opacity-40 transition-opacity"
              >
                加入今日训练
              </button>
            </div>
          </div>
        ) : null}
      </BottomSheet>

      <ConfirmDialog
        open={isContinueExerciseDialogOpen}
        title="继续今日训练？"
        description="会更新今日训练总结。"
        confirmLabel="继续"
        onCancel={() => setIsContinueExerciseDialogOpen(false)}
        onConfirm={() => void addExercise()}
      />

      <ConfirmDialog
        open={pendingTemplateImportConfirmation !== null}
        title="加入这组动作？"
        description={getTemplateImportConfirmDescription()}
        confirmLabel="继续"
        onCancel={() => {
          setPendingTemplateImportId(null)
          setPendingTemplateExerciseIds([])
        }}
        onConfirm={() =>
          void (
            pendingTemplateImportId
              ? importTemplate(pendingTemplateImportId, pendingTemplateExerciseIds)
              : Promise.resolve()
          )
        }
      />

      <ConfirmDialog
        open={deleteExercise !== null}
        title="删除动作？"
        description={deleteExercise ? `确定删除“${deleteExercise.name}”吗？该操作无法恢复。` : ''}
        confirmLabel="删除"
        danger
        onCancel={() => setDeleteExerciseId(null)}
        onConfirm={() => void handleConfirmDelete()}
      />

      <Snackbar message={snackbarMessage} />
    </div>
  )
}
