import { useState, type FormEvent } from 'react'

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
  handleDeleteExercises: (templateId: string, exerciseIds: string[]) => Promise<boolean>
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
  handleDeleteExercise,
  handleDeleteExercises,
  handleDeleteTemplate,
  handleCreateTemplate,
  handleSaveExercise,
  handleSaveTemplateName,
  setNewTemplateName,
}: UseTemplatesPageUiOptions) {
  const { message, setMessage } = useSnackbarMessage()
  const [editExerciseId, setEditExerciseId] = useState<string | null>(null)
  const [exerciseDraft, setExerciseDraft] = useState<TemplateExerciseDraft>(emptyTemplateExerciseDraft)
  const [isCreatingExercise, setIsCreatingExercise] = useState(false)
  const [renameTemplateName, setRenameTemplateName] = useState('')
  const [templateDeleteOpen, setTemplateDeleteOpen] = useState(false)
  const [templateSheetMode, setTemplateSheetMode] = useState<TemplateSheetMode>(null)

  const isExerciseEditorActive = isCreatingExercise || editExerciseId !== null

  function openTemplateSheet(mode: TemplateSheetMode) {
    if (mode === 'create') {
      setNewTemplateName('')
    }

    if (mode === 'rename') {
      setRenameTemplateName(currentTemplate?.name ?? '')
    }

    setTemplateSheetMode(mode)
  }

  function closeExerciseEditor() {
    setEditExerciseId(null)
    setExerciseDraft(emptyTemplateExerciseDraft)
    setIsCreatingExercise(false)
  }

  function openCreateExerciseEditor() {
    setEditExerciseId(null)
    setExerciseDraft(emptyTemplateExerciseDraft)
    setIsCreatingExercise(true)
  }

  function openEditExerciseEditor(exerciseId: string) {
    const exercise = currentTemplate?.exercises.find((item) => item.id === exerciseId)
    if (!exercise) {
      return
    }

    setIsCreatingExercise(false)
    setEditExerciseId(exercise.id)
    setExerciseDraft(toTemplateExerciseDraft(exercise))
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

    if (isCreatingExercise) {
      const didCreate = await handleCreateExercise(currentTemplate.id, exerciseDraft)
      if (didCreate) {
        closeExerciseEditor()
        setMessage('动作已加入模板')
      }
      return
    }

    if (!editExerciseId) {
      return
    }

    const didSave = await handleSaveExercise(currentTemplate.id, editExerciseId, exerciseDraft)
    if (didSave) {
      closeExerciseEditor()
      setMessage('动作已更新')
    }
  }

  async function handleDeleteExerciseAction(exerciseId: string) {
    if (!currentTemplate) {
      return
    }

    const didDelete = await handleDeleteExercise(currentTemplate.id, exerciseId)
    if (didDelete) {
      if (editExerciseId === exerciseId) {
        closeExerciseEditor()
      }
      setMessage('动作已删除')
    }
  }

  async function handleDeleteExercisesAction(exerciseIds: string[]) {
    if (!currentTemplate) {
      return false
    }

    const didDelete = await handleDeleteExercises(currentTemplate.id, exerciseIds)
    if (didDelete) {
      if (editExerciseId && exerciseIds.includes(editExerciseId)) {
        closeExerciseEditor()
      }
      setMessage(`已删除 ${exerciseIds.length} 个动作`)
    }
    return didDelete
  }

  async function handleConfirmDeleteTemplate() {
    if (!currentTemplate) {
      return
    }

    const didDelete = await handleDeleteTemplate(currentTemplate.id)
    if (didDelete) {
      setTemplateDeleteOpen(false)
      setTemplateSheetMode(null)
      closeExerciseEditor()
      setMessage('模板已删除')
    }
  }

  return {
    closeExerciseEditor,
    editExerciseId,
    exerciseDraft,
    handleDeleteExerciseAction,
    handleDeleteExercisesAction,
    handleConfirmDeleteTemplate,
    handleExerciseSubmit,
    handleTemplateSubmit,
    isCreatingExercise,
    isExerciseEditorActive,
    message,
    openCreateExerciseEditor,
    openEditExerciseEditor,
    openTemplateSheet,
    renameTemplateName,
    setExerciseDraft,
    setRenameTemplateName,
    setTemplateDeleteOpen,
    templateDeleteOpen,
    templateSheetMode,
    setTemplateSheetMode,
  }
}
