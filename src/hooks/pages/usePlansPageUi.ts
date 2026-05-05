import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'

import {
  emptyPlanExerciseDraft,
  toPlanExerciseDraft,
  type PlanExerciseDraft,
} from '../../lib/plan-editor'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import type { PlanWithExercises } from '../../db/plans'

type PlanSheetMode = 'create' | 'rename' | null

type UsePlansPageUiOptions = {
  currentPlan: PlanWithExercises | null
  handleCreateExercise: (planId: string, draft: PlanExerciseDraft) => Promise<boolean>
  handleCreatePlan: () => Promise<boolean>
  handleDeleteExercises: (planId: string, exerciseIds: string[]) => Promise<boolean>
  handleDeletePlan: (planId: string) => Promise<boolean>
  handleImportExercises: (planId: string, exerciseIds: string[]) => Promise<boolean>
  handleSaveExercise: (
    planId: string,
    exerciseId: string,
    draft: PlanExerciseDraft,
  ) => Promise<boolean>
  handleSavePlanName: (planId: string, name: string) => Promise<boolean>
  setNewPlanName: (value: string) => void
}

export function usePlansPageUi({
  currentPlan,
  handleCreateExercise,
  handleDeleteExercises,
  handleDeletePlan,
  handleCreatePlan,
  handleImportExercises,
  handleSaveExercise,
  handleSavePlanName,
  setNewPlanName,
}: UsePlansPageUiOptions) {
  const { t } = useTranslation()
  const [editExerciseId, setEditExerciseId] = useState<string | null>(null)
  const [exerciseDraft, setExerciseDraft] = useState<PlanExerciseDraft>(emptyPlanExerciseDraft)
  const [isCreatingExercise, setIsCreatingExercise] = useState(false)
  const [renamePlanName, setRenamePlanName] = useState('')
  const [planDeleteOpen, setPlanDeleteOpen] = useState(false)
  const [planSheetMode, setPlanSheetMode] = useState<PlanSheetMode>(null)
  const [continuousEditExerciseIds, setContinuousEditExerciseIds] = useState<string[]>([])

  const isExerciseEditorActive = isCreatingExercise || editExerciseId !== null

  function openPlanSheet(mode: PlanSheetMode) {
    if (mode === 'create') {
      setNewPlanName('')
    }

    if (mode === 'rename') {
      setRenamePlanName(currentPlan?.name ?? '')
    }

    setPlanSheetMode(mode)
  }

  function closeExerciseEditor() {
    setEditExerciseId(null)
    setExerciseDraft(emptyPlanExerciseDraft)
    setIsCreatingExercise(false)
    setContinuousEditExerciseIds([])
  }

  function openCreateExerciseEditor() {
    setEditExerciseId(null)
    setExerciseDraft(emptyPlanExerciseDraft)
    setIsCreatingExercise(true)
  }

  function openEditExerciseEditor(exerciseId: string) {
    const exercise = currentPlan?.exercises.find((item) => item.id === exerciseId)
    if (!exercise) {
      return false
    }

    setIsCreatingExercise(false)
    setEditExerciseId(exercise.id)
    setExerciseDraft(toPlanExerciseDraft({
      ...exercise,
      name: getDisplayExerciseName(t, exercise),
    }))
    return true
  }

  function startContinuousEdit(exerciseIds: string[]) {
    if (exerciseIds.length === 0) {
      return
    }

    if (openEditExerciseEditor(exerciseIds[0])) {
      setContinuousEditExerciseIds(exerciseIds)
    }
  }

  async function handlePlanSubmit(
    event: FormEvent<HTMLFormElement>,
    renamePlanNameValue: string,
  ) {
    event.preventDefault()

    if (planSheetMode === 'create') {
      const didCreate = await handleCreatePlan()
      if (didCreate) {
        setPlanSheetMode(null)
      }
      return
    }

    if (planSheetMode === 'rename' && currentPlan) {
      const didRename = await handleSavePlanName(currentPlan.id, renamePlanNameValue)
      if (didRename) {
        setPlanSheetMode(null)
      }
    }
  }

  async function handleExerciseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await saveExerciseEditor({ advanceContinuous: true })
  }

  async function saveExerciseEditor({
    advanceContinuous = false,
  }: { advanceContinuous?: boolean } = {}) {
    if (!currentPlan) {
      return false
    }

    if (isCreatingExercise) {
      const didCreate = await handleCreateExercise(currentPlan.id, exerciseDraft)
      if (didCreate) {
        closeExerciseEditor()
      }
      return didCreate
    }

    if (!editExerciseId) {
      return true
    }

    if (!exerciseDraft.name.trim()) {
      return false
    }

    const didSave = await handleSaveExercise(currentPlan.id, editExerciseId, exerciseDraft)
    if (didSave) {
      const currentIndex = continuousEditExerciseIds.indexOf(editExerciseId)
      const nextExerciseId =
        currentIndex >= 0 ? continuousEditExerciseIds[currentIndex + 1] ?? null : null

      if (advanceContinuous && nextExerciseId && openEditExerciseEditor(nextExerciseId)) {
        setContinuousEditExerciseIds(continuousEditExerciseIds.slice(currentIndex + 1))
        return true
      }

      closeExerciseEditor()
    }

    return didSave
  }

  async function openEditExerciseEditorAfterSave(exerciseId: string) {
    if (editExerciseId && editExerciseId !== exerciseId) {
      const didSave = await saveExerciseEditor()
      if (!didSave) {
        return false
      }
    }

    return openEditExerciseEditor(exerciseId)
  }

  async function handleDeleteExercisesAction(exerciseIds: string[]) {
    if (!currentPlan) {
      return false
    }

    const didDelete = await handleDeleteExercises(currentPlan.id, exerciseIds)
    if (didDelete) {
      if (editExerciseId && exerciseIds.includes(editExerciseId)) {
        closeExerciseEditor()
      }
    }
    return didDelete
  }

  async function handleImportExercisesAction(exerciseIds: string[]) {
    if (!currentPlan) {
      return false
    }

    const didImport = await handleImportExercises(currentPlan.id, exerciseIds)
    if (didImport) {
      closeExerciseEditor()
    }
    return didImport
  }

  async function handleConfirmDeletePlan() {
    if (!currentPlan) {
      return
    }

    const didDelete = await handleDeletePlan(currentPlan.id)
    if (didDelete) {
      setPlanDeleteOpen(false)
      setPlanSheetMode(null)
      closeExerciseEditor()
    }
  }

  return {
    closeExerciseEditor,
    editExerciseId,
    exerciseDraft,
    handleDeleteExercisesAction,
    handleConfirmDeletePlan,
    handleExerciseSubmit,
    handleImportExercisesAction,
    handlePlanSubmit,
    saveExerciseEditor,
    isCreatingExercise,
    continuousEditScrollExerciseId: continuousEditExerciseIds.length > 0 ? editExerciseId : null,
    isExerciseEditorActive,
    openCreateExerciseEditor,
    openEditExerciseEditor: openEditExerciseEditorAfterSave,
    openPlanSheet,
    renamePlanName,
    setExerciseDraft,
    setRenamePlanName,
    startContinuousEdit,
    setPlanDeleteOpen,
    planDeleteOpen,
    planSheetMode,
    setPlanSheetMode,
  }
}
