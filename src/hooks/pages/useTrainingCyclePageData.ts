import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  addTrainingCycleSlot,
  assignPlanToTrainingCycleSlot,
  calibrateTrainingCycleToday,
  getOrCreateTrainingCycle,
  getTodayTrainingCycleDay,
  removeTrainingCycleSlot,
  reorderTrainingCycleSlots,
} from '../../db/training-cycle'
import { createPlan, listPlansWithExercises, type PlanWithExercises } from '../../db/plans'
import { triggerHaptic } from '../../lib/haptics'
import { notifyPlansChanged } from '../../lib/plan-change-events'
import type { TrainingCycle } from '../../models/types'

export function useTrainingCyclePageData() {
  const { t } = useTranslation()
  const [plans, setPlans] = useState<PlanWithExercises[]>([])
  const [trainingCycle, setTrainingCycle] = useState<TrainingCycle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [planItems, cycle] = await Promise.all([
      listPlansWithExercises(),
      getOrCreateTrainingCycle(),
    ])

    setPlans(planItems)
    setTrainingCycle(cycle)
  }, [])

  async function runMutation(action: () => Promise<void>) {
    try {
      setIsSubmitting(true)
      setError(null)
      await action()
      return true
    } catch (mutationError) {
      console.error(mutationError)
      setError(
        mutationError instanceof Error ? mutationError.message : t('trainingCycle.saveFailed'),
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
        await loadData()
      } catch (loadError) {
        console.error(loadError)
        setError('循环日程加载失败，请刷新页面后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [loadData])

  async function handleAddSlot() {
    return runMutation(async () => {
      await addTrainingCycleSlot()
      await loadData()
    })
  }

  async function handleCreatePlan(name: string) {
    let createdId: string | null = null
    const saved = await runMutation(async () => {
      const plan = await createPlan(name)
      createdId = plan.id
      await loadData()
      notifyPlansChanged(plan.id)
    })
    return saved ? createdId : null
  }

  async function handleRemoveSlot(slotId: string) {
    const didRemove = await runMutation(async () => {
      await removeTrainingCycleSlot(slotId)
      await loadData()
    })

    if (didRemove) {
      void triggerHaptic('warning')
    }

    return didRemove
  }

  async function handleAssignPlan(slotId: string, planId: string | null) {
    return runMutation(async () => {
      await assignPlanToTrainingCycleSlot(slotId, planId)
      await loadData()
    })
  }

  async function handleCalibrateToday(slotId: string) {
    return runMutation(async () => {
      await calibrateTrainingCycleToday(slotId)
      await loadData()
    })
  }

  async function handleReorderSlots(orderedSlotIds: string[]) {
    return runMutation(async () => {
      await reorderTrainingCycleSlots(orderedSlotIds)
      await loadData()
    })
  }

  return {
    error,
    handleAddSlot,
    handleAssignPlan,
    handleCreatePlan,
    handleCalibrateToday,
    handleRemoveSlot,
    handleReorderSlots,
    isLoading,
    isSubmitting,
    plans,
    refreshPlans: () => runMutation(loadData),
    todayCycleDay: getTodayTrainingCycleDay(trainingCycle),
    trainingCycle,
  }
}
