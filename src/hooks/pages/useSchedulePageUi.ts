import { useMemo, useState, type FormEvent } from 'react'

import type { PlanSyncResult } from '../../db/sessions'
import type { PlanWithExercises } from '../../db/plans'

type PlanImportConfirmation = {
  isDuplicateImport: boolean
  planName: string
  willContinueCompletedSession: boolean
}

type UseSchedulePageUiOptions = {
  getPlanImportConfirmation: (
    planId: string,
    planExerciseIds?: string[],
  ) => PlanImportConfirmation | null
  handleAddPlanExercises: (
    planId: string,
    planExerciseIds?: string[],
  ) => Promise<{ count: number; name: string } | null | false>
  handleAddTemporaryExercise: () => Promise<string | false | null>
  handleDeleteExercises: (planItemIds: string[]) => Promise<boolean>
  handleSyncPlan: () => Promise<PlanSyncResult | false>
  shouldConfirmContinueBeforeAddingExercise: boolean
  plans: PlanWithExercises[]
}

export function useSchedulePageUi({
  getPlanImportConfirmation,
  handleAddPlanExercises,
  handleAddTemporaryExercise,
  handleDeleteExercises,
  handleSyncPlan,
  shouldConfirmContinueBeforeAddingExercise,
  plans,
}: UseSchedulePageUiOptions) {
  const [importSourcePlanId, setImportSourcePlanId] = useState<string | null>(null)
  const [isAllPlanImportMode, setIsAllPlanImportMode] = useState(false)
  const [isContinueDialogOpen, setIsContinueDialogOpen] = useState(false)
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)
  const [isPlanSheetOpen, setIsPlanSheetOpen] = useState(false)
  const [pendingPlanImportId, setPendingPlanImportId] = useState<string | null>(null)
  const [pendingPlanExerciseIds, setPendingPlanExerciseIds] = useState<string[]>([])
  const [selectedPlanExerciseIds, setSelectedPlanExerciseIds] = useState<string[]>([])
  const [customPlanItemIds, setCustomPlanItemIds] = useState<string[]>([])
  const [shouldReturnToPlanImportSheet, setShouldReturnToPlanImportSheet] = useState(false)

  const importSourcePlan = useMemo(
    () => plans.find((plan) => plan.id === importSourcePlanId) ?? null,
    [importSourcePlanId, plans],
  )
  const pendingPlanImportConfirmation = pendingPlanImportId
    ? getPlanImportConfirmation(pendingPlanImportId, pendingPlanExerciseIds)
    : null

  function openAddEntry() {
    const hasPlanExercises = plans.some((plan) => plan.exercises.length > 0)
    if (!hasPlanExercises) {
      setIsCreateSheetOpen(true)
      return
    }

    setImportSourcePlanId(null)
    setSelectedPlanExerciseIds([])
    setIsAllPlanImportMode(true)
    setIsPlanSheetOpen(true)
  }

  function selectPlanForImport(planId: string) {
    const plan = plans.find((item) => item.id === planId)
    setImportSourcePlanId(planId)
    setSelectedPlanExerciseIds(plan?.exercises.map((exercise) => exercise.id) ?? [])
    setIsAllPlanImportMode(false)
    setIsPlanSheetOpen(true)
  }

  function closePlanImportSheet() {
    setIsPlanSheetOpen(false)
    setIsAllPlanImportMode(false)
    setSelectedPlanExerciseIds([])
    setCustomPlanItemIds([])
  }

  function createExerciseFromPlanImportSheet() {
    setIsPlanSheetOpen(false)
    setIsAllPlanImportMode(false)
    setShouldReturnToPlanImportSheet(true)
    setIsCreateSheetOpen(true)
  }

  function closeCreateSheet() {
    setIsCreateSheetOpen(false)
    setShouldReturnToPlanImportSheet(false)
  }

  function togglePlanExercise(exerciseId: string) {
    setSelectedPlanExerciseIds((current) =>
      current.includes(exerciseId)
        ? current.filter((id) => id !== exerciseId)
        : [...current, exerciseId],
    )
  }

  async function importPlan(planId: string, planExerciseIds: string[]) {
    const result = await handleAddPlanExercises(planId, planExerciseIds)
    if (result) {
      setPendingPlanImportId(null)
      setPendingPlanExerciseIds([])
      setIsPlanSheetOpen(false)
    }
  }

  async function handleImportPlan() {
    if (isAllPlanImportMode) {
      if (selectedPlanExerciseIds.length === 0) {
        return
      }

      for (const plan of plans) {
        const selectedIds = plan.exercises
          .filter((exercise) => selectedPlanExerciseIds.includes(exercise.id))
          .map((exercise) => exercise.id)

        if (selectedIds.length > 0) {
          const result = await handleAddPlanExercises(plan.id, selectedIds)
          if (!result) {
            return
          }
        }
      }

      closePlanImportSheet()
      return
    }

    if (!importSourcePlanId) {
      return
    }

    if (selectedPlanExerciseIds.length === 0) {
      return
    }

    if (getPlanImportConfirmation(importSourcePlanId, selectedPlanExerciseIds)) {
      setPendingPlanImportId(importSourcePlanId)
      setPendingPlanExerciseIds(selectedPlanExerciseIds)
      return
    }

    await importPlan(importSourcePlanId, selectedPlanExerciseIds)
  }

  async function confirmPendingPlanImport() {
    if (!pendingPlanImportId) {
      return
    }

    await importPlan(pendingPlanImportId, pendingPlanExerciseIds)
  }

  async function addExercise() {
    const createdPlanItemId = await handleAddTemporaryExercise()
    if (createdPlanItemId) {
      setIsContinueDialogOpen(false)
      setIsCreateSheetOpen(false)
      if (shouldReturnToPlanImportSheet) {
        setShouldReturnToPlanImportSheet(false)
        setCustomPlanItemIds((current) => [...current, createdPlanItemId])
        setSelectedPlanExerciseIds((current) => [...current, createdPlanItemId])
        setIsAllPlanImportMode(true)
        setIsPlanSheetOpen(true)
      }
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

  async function handleSyncPlanAction() {
    await handleSyncPlan()
  }

  return {
    addExercise,
    confirmPendingPlanImport,
    customPlanItemIds,
    handleAddExercise,
    handleDeleteExercisesAction,
    handleImportPlan,
    handleSyncPlanAction,
    importSourcePlan,
    isAllPlanImportMode,
    isContinueDialogOpen,
    isCreateSheetOpen,
    isPlanSheetOpen,
    closeCreateSheet,
    closePlanImportSheet,
    createExerciseFromPlanImportSheet,
    openAddEntry,
    pendingPlanExerciseIds,
    pendingPlanImportConfirmation,
    selectPlanForImport,
    selectedPlanExerciseIds,
    setIsContinueDialogOpen,
    setIsCreateSheetOpen,
    setIsPlanSheetOpen,
    setPendingPlanExerciseIds,
    setPendingPlanImportId,
    togglePlanExercise,
  }
}
