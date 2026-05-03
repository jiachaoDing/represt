import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import {
  addPlanExercisesToSessionPlan,
  addTemporarySessionPlanItem,
  deletePendingSessionPlanItem,
  getCurrentSession,
  getOrCreateTodaySession,
  getSessionPlanSyncStatus,
  markSessionPlanSynced,
  replaceSessionPlanItem,
  reorderSessionPlanItems,
  syncSessionPlanFromPlan,
  type PlanSyncResult,
  type PlanSyncStatus,
  type WorkoutSessionWithExercises,
} from '../../db/sessions'
import { getTodayTrainingCycleDay, getTrainingCycle } from '../../db/training-cycle'
import {
  createPlanFromSessionPlanItems,
  listPlansWithExercises,
  replacePlanExercisesFromSessionPlanItems,
  type PlanWithExercises,
} from '../../db/plans'
import {
  draftToSessionPlanInput,
  emptyExerciseDraft,
  hasImportedPlanExercises,
} from './schedule-page-data.utils'
import { triggerHaptic } from '../../lib/haptics'
import type { PlanExerciseDraft } from '../../lib/plan-editor'
import type { TrainingCycle } from '../../models/types'

type PlanImportConfirmation = {
  isDuplicateImport: boolean
  planName: string
  willContinueCompletedSession: boolean
}

export function useSchedulePageData() {
  const location = useLocation()
  const [plans, setPlans] = useState<PlanWithExercises[]>([])
  const [trainingCycle, setTrainingCycle] = useState<TrainingCycle | null>(null)
  const [currentSession, setCurrentSession] = useState<WorkoutSessionWithExercises | null>(null)
  const [planSyncStatus, setPlanSyncStatus] = useState<PlanSyncStatus>({
    hasUpdates: false,
    planName: null,
  })
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null)
  const [newExerciseDraft, setNewExerciseDraft] = useState<PlanExerciseDraft>(emptyExerciseDraft)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [planItems, session, cycle] = await Promise.all([
      listPlansWithExercises(),
      getCurrentSession(),
      getTrainingCycle(),
    ])

    return {
      cycle,
      session,
      planItems,
    }
  }, [])

  const loadData = useCallback(async (preferredPlanId?: string | null) => {
    const { cycle, session, planItems } = await fetchData()
    const nextPlanSyncStatus = session
      ? await getSessionPlanSyncStatus(session.id)
      : { hasUpdates: false, planName: null }

    setPlans(planItems)
    setTrainingCycle(cycle)
    setCurrentSession(session)
    setPlanSyncStatus(nextPlanSyncStatus)
    setSelectedPlanId((current) => {
      if (
        preferredPlanId &&
        planItems.some((plan) => plan.id === preferredPlanId)
      ) {
        return preferredPlanId
      }

      if (current && planItems.some((plan) => plan.id === current)) {
        return current
      }

      return planItems[0]?.id ?? null
    })
  }, [fetchData])

  async function runMutation(action: () => Promise<void>) {
    try {
      setIsSubmitting(true)
      setError(null)
      await action()
      return true
    } catch (mutationError) {
      console.error(mutationError)
      setError(
        mutationError instanceof Error ? mutationError.message : '训练安排保存失败，请重试。',
      )
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
        await getOrCreateTodaySession()
        const { planItems } = await fetchData()
        await loadData(planItems[0]?.id ?? null)
      } catch (loadError) {
        console.error(loadError)
        setError('训练安排加载失败，请刷新页面后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [fetchData, loadData])

  useEffect(() => {
    if (location.pathname !== '/' || isLoading) {
      return
    }

    async function refreshData() {
      try {
        await loadData(selectedPlanId)
      } catch (loadError) {
        console.error(loadError)
        setError('训练安排加载失败，请刷新页面后重试。')
      }
    }

    void refreshData()
  }, [isLoading, loadData, location.pathname, selectedPlanId])

  async function handleAddPlanExercises(planId: string, planExerciseIds?: string[]) {
    if (!currentSession) {
      return false
    }

    setSelectedPlanId(planId)

    const didSucceed = await runMutation(async () => {
      await addPlanExercisesToSessionPlan(currentSession.id, planId, planExerciseIds)
      await loadData(planId)
    })

    if (!didSucceed) {
      return null
    }

    const selectedPlanExerciseIds = planExerciseIds ? new Set(planExerciseIds) : null
    const plan = plans.find((item) => item.id === planId)

    return plan
      ? {
          count: plan.exercises.filter((exercise) =>
            selectedPlanExerciseIds ? selectedPlanExerciseIds.has(exercise.id) : true,
          ).length,
          name: plan.name,
        }
      : null
  }

  function getPlanImportConfirmation(
    planId: string,
    planExerciseIds?: string[],
  ): PlanImportConfirmation | null {
    if (!currentSession) {
      return null
    }

    const plan = plans.find((item) => item.id === planId)
    if (!plan) {
      return null
    }

    const isDuplicateImport = hasImportedPlanExercises(
      currentSession,
      plan,
      planExerciseIds,
    )
    const willContinueCompletedSession = currentSession.status === 'completed'

    if (!isDuplicateImport && !willContinueCompletedSession) {
      return null
    }

    return {
      isDuplicateImport,
      planName: plan.name,
      willContinueCompletedSession,
    }
  }

  async function handleAddTemporaryExercise() {
    if (!currentSession) {
      return false
    }

    let createdPlanItemId: string | null = null
    const didSucceed = await runMutation(async () => {
      const planItem = await addTemporarySessionPlanItem(
        currentSession.id,
        draftToSessionPlanInput(newExerciseDraft),
      )
      createdPlanItemId = planItem.id
      setNewExerciseDraft(emptyExerciseDraft)
      await loadData(selectedPlanId)
    })

    return didSucceed ? createdPlanItemId : false
  }

  async function handleReplaceExercise(planItemId: string, draft: PlanExerciseDraft) {
    if (!currentSession) {
      return false
    }

    return runMutation(async () => {
      await replaceSessionPlanItem(currentSession.id, planItemId, draftToSessionPlanInput(draft))
      await loadData(selectedPlanId)
    })
  }

  async function handleReorderExercises(orderedExerciseIds: string[]) {
    if (!currentSession) {
      return false
    }

    return runMutation(async () => {
      await reorderSessionPlanItems(currentSession.id, orderedExerciseIds)
      await loadData(selectedPlanId)
    })
  }

  async function handleDeleteExercises(planItemIds: string[]) {
    if (!currentSession || planItemIds.length === 0) {
      return false
    }

    const didDelete = await runMutation(async () => {
      for (const planItemId of planItemIds) {
        await deletePendingSessionPlanItem(currentSession.id, planItemId)
      }
      await loadData(selectedPlanId)
    })

    if (didDelete) {
      void triggerHaptic('warning')
    }

    return didDelete
  }

  async function handleSyncPlan(): Promise<PlanSyncResult | false> {
    if (!currentSession) {
      return false
    }

    let result: PlanSyncResult | false = false
    const didSucceed = await runMutation(async () => {
      result = await syncSessionPlanFromPlan(currentSession.id)
      await loadData(selectedPlanId)
    })

    return didSucceed ? result : false
  }

  async function handleCreatePlanFromToday(name: string) {
    if (!currentSession || currentSession.exercises.length === 0) {
      return false
    }

    let savedPlanId: string | null = null
    const didSucceed = await runMutation(async () => {
      const plan = await createPlanFromSessionPlanItems(name, currentSession.exercises)
      savedPlanId = plan?.id ?? null
      await loadData(savedPlanId)
    })

    return didSucceed && savedPlanId !== null
  }

  async function handleOverwritePlanFromToday(planId: string) {
    if (!currentSession || currentSession.exercises.length === 0) {
      return false
    }

    let didSave = false
    const didSucceed = await runMutation(async () => {
      const plan = await replacePlanExercisesFromSessionPlanItems(
        planId,
        currentSession.exercises,
      )
      if (!plan) {
        return
      }

      if (currentSession.plannedPlanId === planId) {
        await markSessionPlanSynced(currentSession.id, planId, plan.updatedAt)
      }

      didSave = true
      await loadData(planId)
    })

    return didSucceed && didSave
  }

  const todayCycleDay = getTodayTrainingCycleDay(trainingCycle)
  const todayPlan =
    todayCycleDay?.slot.planId
      ? plans.find((plan) => plan.id === todayCycleDay.slot.planId) ?? null
      : null
  const canAddTemporaryExercise = currentSession !== null
  const didAutoImportToday =
    currentSession !== null &&
    todayPlan !== null &&
    currentSession.plannedPlanId === todayPlan.id &&
    currentSession.plannedPlanSelectedAt !== null
  const shouldConfirmContinueBeforeAddingExercise = currentSession?.status === 'completed'
  const hasPlans = plans.length > 0

  return {
    canAddTemporaryExercise,
    currentSession,
    didAutoImportToday,
    error,
    handleAddTemporaryExercise,
    handleAddPlanExercises,
    handleDeleteExercises,
    handleCreatePlanFromToday,
    handleOverwritePlanFromToday,
    handleReplaceExercise,
    handleReorderExercises,
    handleSyncPlan,
    hasPlans,
    getPlanImportConfirmation,
    isLoading,
    isSubmitting,
    newExerciseDraft,
    selectedPlanId,
    setNewExerciseDraft,
    setSelectedPlanId,
    shouldConfirmContinueBeforeAddingExercise,
    planSyncStatus,
    todayCycleDay,
    todayPlan,
    trainingCycle,
    plans,
  }
}
