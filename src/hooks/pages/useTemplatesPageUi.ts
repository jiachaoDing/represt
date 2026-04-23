import { useMemo, useState, type FormEvent } from 'react'

import { useSnackbarMessage } from '../useSnackbarMessage'
import {
  emptyTemplateExerciseDraft,
  toTemplateExerciseDraft,
  type TemplateExerciseDraft,
} from '../../lib/template-editor'
import type { TemplateWithExercises } from '../../db/templates'

type TemplateSheetMode = 'create' | 'rename' | null

type UseTemplatesPageUiOptions = {
  currentTemplate: TemplateWithExercises | null
  handleCreateExercise: (templateId: string, draft: TemplateExerciseDraft) => Promise<boolean>
  handleCreateTemplate: () => Promise<boolean>
  handleDeleteExercise: (templateId: string, exerciseId: string) => Promise<boolean>
  handleDeleteTemplate: (templateId: string) => Promise<boolean>
  handleSaveExercise: (
    templateId: string,
    exerciseId: string,
    draft: TemplateExerciseDraft,
  ) => Promise<boolean>
  handleSaveTemplateName: (templateId: string, name: string) => Promise<boolean>
  setNewTemplateName: (value: string) => void
}

export function useTemplatesPageUi({
  currentTemplate,
  handleCreateExercise,
  handleCreateTemplate,
  handleDeleteExercise,
  handleDeleteTemplate,
  handleSaveExercise,
  handleSaveTemplateName,
  setNewTemplateName,
}: UseTemplatesPageUiOptions) {
  const { message, setMessage } = useSnackbarMessage()
  const [deleteExerciseId, setDeleteExerciseId] = useState<string | null>(null)
  const [editExerciseId, setEditExerciseId] = useState<string | null>(null)
  const [exerciseDraft, setExerciseDraft] = useState<TemplateExerciseDraft>(emptyTemplateExerciseDraft)
  const [isExerciseSheetOpen, setIsExerciseSheetOpen] = useState(false)
  const [renameTemplateName, setRenameTemplateName] = useState('')
  const [templateDeleteOpen, setTemplateDeleteOpen] = useState(false)
  const [templateSheetMode, setTemplateSheetMode] = useState<TemplateSheetMode>(null)

  const deleteExercise = useMemo(
    () => currentTemplate?.exercises.find((exercise) => exercise.id === deleteExerciseId) ?? null,
    [currentTemplate, deleteExerciseId],
  )

  function openTemplateSheet(mode: TemplateSheetMode) {
    if (mode === 'create') {
      setNewTemplateName('')
    }

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

  function closeExerciseSheet() {
    setEditExerciseId(null)
    setExerciseDraft(emptyTemplateExerciseDraft)
    setIsExerciseSheetOpen(false)
  }

  async function handleTemplateSubmit(
    event: FormEvent<HTMLFormElement>,
    renameTemplateNameValue: string,
  ) {
    event.preventDefault()

    if (templateSheetMode === 'create') {
      const didCreate = await handleCreateTemplate()
      if (didCreate) {
        setTemplateSheetMode(null)
        setMessage('模板已创建')
      }
      return
    }

    if (templateSheetMode === 'rename' && currentTemplate) {
      const didRename = await handleSaveTemplateName(currentTemplate.id, renameTemplateNameValue)
      if (didRename) {
        setTemplateSheetMode(null)
        setMessage('模板名称已更新')
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
        closeExerciseSheet()
        setMessage('动作已加入模板')
      }
      return
    }

    const didSave = await handleSaveExercise(currentTemplate.id, editExerciseId, exerciseDraft)
    if (didSave) {
      closeExerciseSheet()
      setMessage('动作已更新')
    }
  }

  async function handleConfirmDeleteExercise() {
    if (!currentTemplate || !deleteExerciseId) {
      return
    }

    const didDelete = await handleDeleteExercise(currentTemplate.id, deleteExerciseId)
    if (didDelete) {
      setDeleteExerciseId(null)
      closeExerciseSheet()
      setMessage('动作已删除')
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
      closeExerciseSheet()
      setMessage('模板已删除')
    }
  }

  return {
    closeExerciseSheet,
    deleteExercise,
    editExerciseId,
    exerciseDraft,
    handleConfirmDeleteExercise,
    handleConfirmDeleteTemplate,
    handleExerciseSubmit,
    handleTemplateSubmit,
    isExerciseSheetOpen,
    message,
    openCreateExerciseSheet,
    openEditExerciseSheet,
    openTemplateSheet,
    renameTemplateName,
    setDeleteExerciseId,
    setExerciseDraft,
    setRenameTemplateName,
    setTemplateDeleteOpen,
    templateDeleteOpen,
    templateSheetMode,
    setTemplateSheetMode,
  }
}
