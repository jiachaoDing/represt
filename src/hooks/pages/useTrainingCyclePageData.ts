import { useCallback, useEffect, useState } from 'react'

import {
  addTrainingCycleSlot,
  assignTemplateToTrainingCycleSlot,
  calibrateTrainingCycleToday,
  getOrCreateTrainingCycle,
  getTodayTrainingCycleDay,
  removeTrainingCycleSlot,
  reorderTrainingCycleSlots,
} from '../../db/training-cycle'
import { listTemplatesWithExercises, type TemplateWithExercises } from '../../db/templates'
import { triggerHaptic } from '../../lib/haptics'
import type { TrainingCycle } from '../../models/types'

export function useTrainingCyclePageData() {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [trainingCycle, setTrainingCycle] = useState<TrainingCycle | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [templateItems, cycle] = await Promise.all([
      listTemplatesWithExercises(),
      getOrCreateTrainingCycle(),
    ])

    setTemplates(templateItems)
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
        mutationError instanceof Error ? mutationError.message : '循环日程保存失败，请重试。',
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

  async function handleAssignTemplate(slotId: string, templateId: string | null) {
    return runMutation(async () => {
      await assignTemplateToTrainingCycleSlot(slotId, templateId)
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
    handleAssignTemplate,
    handleCalibrateToday,
    handleRemoveSlot,
    handleReorderSlots,
    isLoading,
    isSubmitting,
    templates,
    todayCycleDay: getTodayTrainingCycleDay(trainingCycle),
    trainingCycle,
  }
}
