import { useMemo, useState, type FormEvent } from 'react'

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
  handleDeleteExercises: (planItemIds: string[]) => Promise<boolean>
  handleSyncTemplate: () => Promise<TemplateSyncResult | false>
  shouldConfirmContinueBeforeAddingExercise: boolean
  templates: TemplateWithExercises[]
}

export function useSchedulePageUi({
  getTemplateImportConfirmation,
  handleAddTemplateExercises,
  handleAddTemporaryExercise,
  handleDeleteExercises,
  handleSyncTemplate,
  shouldConfirmContinueBeforeAddingExercise,
  templates,
}: UseSchedulePageUiOptions) {
  const [importSourceTemplateId, setImportSourceTemplateId] = useState<string | null>(null)
  const [isAllTemplateImportMode, setIsAllTemplateImportMode] = useState(false)
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
    const hasTemplateExercises = templates.some((template) => template.exercises.length > 0)
    if (!hasTemplateExercises) {
      setIsCreateSheetOpen(true)
      return
    }

    setImportSourceTemplateId(null)
    setSelectedTemplateExerciseIds([])
    setIsAllTemplateImportMode(true)
    setIsTemplateSheetOpen(true)
  }

  function selectTemplateForImport(templateId: string) {
    const template = templates.find((item) => item.id === templateId)
    setImportSourceTemplateId(templateId)
    setSelectedTemplateExerciseIds(template?.exercises.map((exercise) => exercise.id) ?? [])
    setIsAllTemplateImportMode(false)
    setIsTemplateSheetOpen(true)
  }

  function closeTemplateImportSheet() {
    setIsTemplateSheetOpen(false)
    setIsAllTemplateImportMode(false)
    setSelectedTemplateExerciseIds([])
  }

  function createExerciseFromTemplateImportSheet() {
    closeTemplateImportSheet()
    setIsCreateSheetOpen(true)
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
    }
  }

  async function handleImportTemplate() {
    if (isAllTemplateImportMode) {
      if (selectedTemplateExerciseIds.length === 0) {
        return
      }

      for (const template of templates) {
        const selectedIds = template.exercises
          .filter((exercise) => selectedTemplateExerciseIds.includes(exercise.id))
          .map((exercise) => exercise.id)

        if (selectedIds.length > 0) {
          const result = await handleAddTemplateExercises(template.id, selectedIds)
          if (!result) {
            return
          }
        }
      }

      closeTemplateImportSheet()
      return
    }

    if (!importSourceTemplateId) {
      return
    }

    if (selectedTemplateExerciseIds.length === 0) {
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

  async function handleDeleteExercisesAction(planItemIds: string[]) {
    const didDelete = await handleDeleteExercises(planItemIds)
    return didDelete
  }

  async function handleSyncTemplateAction() {
    await handleSyncTemplate()
  }

  return {
    addExercise,
    confirmPendingTemplateImport,
    handleAddExercise,
    handleDeleteExercisesAction,
    handleImportTemplate,
    handleSyncTemplateAction,
    importSourceTemplate,
    isAllTemplateImportMode,
    isContinueDialogOpen,
    isCreateSheetOpen,
    isTemplateSheetOpen,
    closeTemplateImportSheet,
    createExerciseFromTemplateImportSheet,
    openAddEntry,
    pendingTemplateExerciseIds,
    pendingTemplateImportConfirmation,
    selectTemplateForImport,
    selectedTemplateExerciseIds,
    setIsContinueDialogOpen,
    setIsCreateSheetOpen,
    setIsTemplateSheetOpen,
    setPendingTemplateExerciseIds,
    setPendingTemplateImportId,
    toggleTemplateExercise,
  }
}
