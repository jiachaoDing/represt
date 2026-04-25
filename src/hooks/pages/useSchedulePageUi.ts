import { useMemo, useState, type FormEvent } from 'react'

import { useSnackbarMessage } from '../useSnackbarMessage'
import type { TemplateSyncResult } from '../../db/sessions'
import type { TemplateWithExercises } from '../../db/templates'

type TemplateImportConfirmation = {
  isDuplicateImport: boolean
  templateName: string
  willContinueCompletedSession: boolean
}

type UseSchedulePageUiOptions = {
  getTemplateImportConfirmation: (
    templateId: string,
    templateExerciseIds?: string[],
  ) => TemplateImportConfirmation | null
  handleAddTemplateExercises: (
    templateId: string,
    templateExerciseIds?: string[],
  ) => Promise<{ count: number; name: string } | null | false>
  handleAddTemporaryExercise: () => Promise<boolean>
  handleDeleteExercise: (sessionExerciseId: string) => Promise<boolean>
  handleDeleteExercises: (sessionExerciseIds: string[]) => Promise<boolean>
  handleSyncTemplate: () => Promise<TemplateSyncResult | false>
  hasTemplates: boolean
  shouldConfirmContinueBeforeAddingExercise: boolean
  templates: TemplateWithExercises[]
}

export function useSchedulePageUi({
  getTemplateImportConfirmation,
  handleAddTemplateExercises,
  handleAddTemporaryExercise,
  handleDeleteExercise,
  handleDeleteExercises,
  handleSyncTemplate,
  hasTemplates,
  shouldConfirmContinueBeforeAddingExercise,
  templates,
}: UseSchedulePageUiOptions) {
  const { message, setMessage } = useSnackbarMessage()
  const [importSourceTemplateId, setImportSourceTemplateId] = useState<string | null>(null)
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false)
  const [isContinueDialogOpen, setIsContinueDialogOpen] = useState(false)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [isTemplateSheetOpen, setIsTemplateSheetOpen] = useState(false)
  const [pendingTemplateImportId, setPendingTemplateImportId] = useState<string | null>(null)
  const [pendingTemplateExerciseIds, setPendingTemplateExerciseIds] = useState<string[]>([])
  const [selectedTemplateExerciseIds, setSelectedTemplateExerciseIds] = useState<string[]>([])

  const importSourceTemplate = useMemo(
    () => templates.find((template) => template.id === importSourceTemplateId) ?? null,
    [importSourceTemplateId, templates],
  )
  const pendingTemplateImportConfirmation = pendingTemplateImportId
    ? getTemplateImportConfirmation(pendingTemplateImportId, pendingTemplateExerciseIds)
    : null

  function openAddEntry() {
    if (hasTemplates) {
      setIsActionSheetOpen(true)
      return
    }

    setIsCreateSheetOpen(true)
  }

  function selectTemplateForImport(templateId: string) {
    const template = templates.find((item) => item.id === templateId)
    setImportSourceTemplateId(templateId)
    setSelectedTemplateExerciseIds(template?.exercises.map((exercise) => exercise.id) ?? [])
    setIsActionSheetOpen(false)
    setIsTemplateSheetOpen(true)
  }

  function toggleTemplateExercise(exerciseId: string) {
    setSelectedTemplateExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((id) => id !== exerciseId)
        : [...current, exerciseId],
    )
  }

  async function importTemplate(templateId: string, templateExerciseIds: string[]) {
    const result = await handleAddTemplateExercises(templateId, templateExerciseIds)
    if (result) {
      setPendingTemplateImportId(null)
      setPendingTemplateExerciseIds([])
      setIsTemplateSheetOpen(false)
      setMessage(`已把 ${result.name} 的 ${result.count} 个动作加入今日训练`)
    }
  }

  async function handleImportTemplate() {
    if (!importSourceTemplateId) {
      return
    }

    if (selectedTemplateExerciseIds.length === 0) {
      setMessage('至少选择 1 个动作')
      return
    }

    if (getTemplateImportConfirmation(importSourceTemplateId, selectedTemplateExerciseIds)) {
      setPendingTemplateImportId(importSourceTemplateId)
      setPendingTemplateExerciseIds(selectedTemplateExerciseIds)
      return
    }

    await importTemplate(importSourceTemplateId, selectedTemplateExerciseIds)
  }

  async function confirmPendingTemplateImport() {
    if (!pendingTemplateImportId) {
      return
    }

    await importTemplate(pendingTemplateImportId, pendingTemplateExerciseIds)
  }

  async function addExercise() {
    const didCreate = await handleAddTemporaryExercise()
    if (didCreate) {
      setIsContinueDialogOpen(false)
      setIsCreateSheetOpen(false)
      setMessage('动作已加入今日训练')
    }
  }

  async function handleAddExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (shouldConfirmContinueBeforeAddingExercise) {
      setIsContinueDialogOpen(true)
      return
    }

    await addExercise()
  }

  async function handleDeleteExerciseAction(sessionExerciseId: string) {
    const didDelete = await handleDeleteExercise(sessionExerciseId)
    if (didDelete) {
      setMessage('动作已删除')
    }
  }

  async function handleDeleteExercisesAction(sessionExerciseIds: string[]) {
    const didDelete = await handleDeleteExercises(sessionExerciseIds)
    if (didDelete) {
      setMessage(`已删除 ${sessionExerciseIds.length} 个动作`)
    }
    return didDelete
  }

  async function handleSyncTemplateAction() {
    const result = await handleSyncTemplate()
    if (!result) {
      return
    }

    const changedCount = result.addedCount + result.updatedCount + result.removedCount
    setMessage(changedCount > 0 ? '已同步模板更新' : '模板已是最新')
  }

  return {
    addExercise,
    confirmPendingTemplateImport,
    handleAddExercise,
    handleDeleteExerciseAction,
    handleDeleteExercisesAction,
    handleImportTemplate,
    handleSyncTemplateAction,
    importSourceTemplate,
    isActionSheetOpen,
    isContinueDialogOpen,
    isCreateSheetOpen,
    isTemplateSheetOpen,
    message,
    openAddEntry,
    pendingTemplateExerciseIds,
    pendingTemplateImportConfirmation,
    selectTemplateForImport,
    selectedTemplateExerciseIds,
    setIsActionSheetOpen,
    setIsContinueDialogOpen,
    setIsCreateSheetOpen,
    setIsTemplateSheetOpen,
    setPendingTemplateExerciseIds,
    setPendingTemplateImportId,
    toggleTemplateExercise,
  }
}
