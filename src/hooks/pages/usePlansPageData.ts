import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  createPlan,
  createPlanExercise,
  deletePlan,
  deletePlanExercise,
  importPlanExercises,
  listPlansWithExercises,
  reorderPlanExercises,
  updatePlanExercise,
  updatePlanName,
  type PlanWithExercises,
} from '../../db/plans'
import {
  getTodayTrainingCycleDay,
  getTrainingCycle,
  getTrainingCyclePlanDaysUntil,
  getTrainingCyclePlanIndexes,
} from '../../db/training-cycle'
import {
  parseOptionalDistanceMeters,
  parseOptionalDurationSeconds,
  parseIntegerInput,
  parseOptionalReps,
  parseOptionalWeightKg,
} from '../../lib/input-parsers'
import { triggerHaptic } from '../../lib/haptics'
import type { PlanExerciseDraft } from '../../lib/plan-editor'
import type { TrainingCycle } from '../../models/types'

export function usePlansPageData() {
  const { t } = useTranslation()
  const [plans, setPlans] = useState<PlanWithExercises[]>([])
  const [trainingCycle, setTrainingCycle] = useState<TrainingCycle | null>(null)
  const [newPlanName, setNewPlanName] = useState('')
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastCreatedExerciseId, setLastCreatedExerciseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadPlans(preferredPlanId?: string | null) {
    const [items, cycle] = await Promise.all([listPlansWithExercises(), getTrainingCycle()])
    setPlans(items)
    setTrainingCycle(cycle)
    setSelectedPlanId((current) => {
      if (preferredPlanId !== undefined) {
        return items.some((plan) => plan.id === preferredPlanId)
          ? preferredPlanId
          : (items[0]?.id ?? null)
      }

      return items.some((plan) => plan.id === current) ? current : (items[0]?.id ?? null)
    })
  }

  async function runMutation(action: () => Promise<void>) {
    try {
      setIsSubmitting(true)
      setError(null)
      await action()
      return true
    } catch (mutationError) {
      console.error(mutationError)
      setError(t('plans.saveFailed'))
      void triggerHaptic('error')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        setError(null)
        await loadPlans()
      } catch (loadError) {
        console.error(loadError)
        setError(t('plans.loadFailed'))
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [t])

  async function handleCreatePlan() {
    const didCreate = await runMutation(async () => {
      const plan = await createPlan(newPlanName || t('common.unnamedPlan'))
      setNewPlanName('')
      await loadPlans(plan.id)
    })

    if (didCreate) {
      void triggerHaptic('success')
    }

    return didCreate
  }

  async function handleSavePlanName(planId: string, name: string) {
    const didSave = await runMutation(async () => {
      await updatePlanName(planId, name || t('common.unnamedPlan'))
      await loadPlans(planId)
    })

    if (didSave) {
      void triggerHaptic('success')
    }

    return didSave
  }

  async function handleDeletePlan(planId: string) {
    const didDelete = await runMutation(async () => {
      await deletePlan(planId)
      await loadPlans()
    })

    if (didDelete) {
      void triggerHaptic('warning')
    }

    return didDelete
  }

  async function handleCreateExercise(planId: string, draft: PlanExerciseDraft) {
    return runMutation(async () => {
      const exercise = await createPlanExercise(planId, {
        name: draft.name || t('common.unnamedExercise'),
        catalogExerciseId: draft.catalogExerciseId,
        targetSets: parseIntegerInput(draft.targetSets),
        restSeconds: parseIntegerInput(draft.restSeconds),
        weightKg: parseOptionalWeightKg(draft.weightKg),
        reps: parseOptionalReps(draft.reps),
        durationSeconds: parseOptionalDurationSeconds(draft.durationSeconds),
        distanceMeters: parseOptionalDistanceMeters(draft.distanceMeters),
      })
      setLastCreatedExerciseId(exercise.id)
      await loadPlans(planId)
    })
  }

  async function handleImportExercises(planId: string, exerciseIds: string[]) {
    const didImport = await runMutation(async () => {
      const importedExercises = await importPlanExercises(planId, exerciseIds)
      setLastCreatedExerciseId(importedExercises.at(-1)?.id ?? null)
      await loadPlans(planId)
    })

    if (didImport) {
      void triggerHaptic('success')
    }

    return didImport
  }

  async function handleSaveExercise(
    planId: string,
    exerciseId: string,
    draft: PlanExerciseDraft,
  ) {
    return runMutation(async () => {
      await updatePlanExercise(exerciseId, {
        name: draft.name || t('common.unnamedExercise'),
        catalogExerciseId: draft.catalogExerciseId,
        targetSets: parseIntegerInput(draft.targetSets),
        restSeconds: parseIntegerInput(draft.restSeconds),
        weightKg: parseOptionalWeightKg(draft.weightKg),
        reps: parseOptionalReps(draft.reps),
        durationSeconds: parseOptionalDurationSeconds(draft.durationSeconds),
        distanceMeters: parseOptionalDistanceMeters(draft.distanceMeters),
      })
      await loadPlans(planId)
    })
  }

  async function handleDeleteExercises(planId: string, exerciseIds: string[]) {
    if (exerciseIds.length === 0) {
      return false
    }

    const didDelete = await runMutation(async () => {
      for (const exerciseId of exerciseIds) {
        await deletePlanExercise(exerciseId)
      }
      await loadPlans(planId)
    })

    if (didDelete) {
      void triggerHaptic('warning')
    }

    return didDelete
  }

  async function handleReorderExercises(planId: string, orderedExerciseIds: string[]) {
    return runMutation(async () => {
      await reorderPlanExercises(planId, orderedExerciseIds)
      await loadPlans(planId)
    })
  }

  const currentPlan =
    plans.find((plan) => plan.id === selectedPlanId) ?? null
  const todayCycleDay = useMemo(() => getTodayTrainingCycleDay(trainingCycle), [trainingCycle])
  const todayPlan = useMemo(() => {
    if (!todayCycleDay?.slot.planId) {
      return null
    }

    return plans.find((plan) => plan.id === todayCycleDay.slot.planId) ?? null
  }, [plans, todayCycleDay])
  const currentPlanCyclePreview = useMemo(() => {
    if (!currentPlan) {
      return null
    }

    return {
      daysUntil: getTrainingCyclePlanDaysUntil(trainingCycle, currentPlan.id),
      slotIndexes: getTrainingCyclePlanIndexes(trainingCycle, currentPlan.id),
    }
  }, [currentPlan, trainingCycle])

  return {
    clearLastCreatedExerciseId: () => setLastCreatedExerciseId(null),
    currentPlan,
    currentPlanCyclePreview,
    error,
    handleCreateExercise,
    handleCreatePlan,
    handleDeleteExercises,
    handleDeletePlan,
    handleImportExercises,
    handleReorderExercises,
    handleSaveExercise,
    handleSavePlanName,
    isLoading,
    isSubmitting,
    lastCreatedExerciseId,
    newPlanName,
    setNewPlanName,
    selectedPlanId,
    setSelectedPlanId,
    todayCycleDay,
    todayPlan,
    trainingCycle,
    plans,
  }
}
