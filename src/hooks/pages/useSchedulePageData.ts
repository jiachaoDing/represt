import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

import {
  addTemplateExercisesToSession,
  addTemporarySessionExercise,
  deletePendingSessionExercise,
  getCurrentSession,
  getOrCreateTodaySession,
  getSessionTemplateSyncStatus,
  reorderSessionExercises,
  syncSessionFromTemplate,
  type TemplateSyncResult,
  type TemplateSyncStatus,
  type WorkoutSessionWithExercises,
} from '../../db/sessions'
import { getTodayTrainingCycleDay, getTrainingCycle } from '../../db/training-cycle'
import { listTemplatesWithExercises, type TemplateWithExercises } from '../../db/templates'
import {
  parseIntegerInput,
  parseOptionalReps,
  parseOptionalWeightKg,
} from '../../lib/input-parsers'
import { triggerHaptic } from '../../lib/haptics'
import type { TrainingCycle } from '../../models/types'

type ScheduleExerciseDraft = {
  name: string
  targetSets: string
  restSeconds: string
  weightKg: string
  reps: string
}

type TemplateImportConfirmation = {
  isDuplicateImport: boolean
  templateName: string
  willContinueCompletedSession: boolean
}

const emptyExerciseDraft: ScheduleExerciseDraft = {
  name: '',
  targetSets: '3',
  restSeconds: '90',
  weightKg: '',
  reps: '',
}

function hasImportedTemplateExercises(
  session: WorkoutSessionWithExercises,
  template: TemplateWithExercises,
  templateExerciseIds?: string[],
) {
  const selectedTemplateExerciseIds = templateExerciseIds ? new Set(templateExerciseIds) : null
  const selectedExercises = template.exercises.filter((exercise) =>
    selectedTemplateExerciseIds ? selectedTemplateExerciseIds.has(exercise.id) : true,
  )

  if (selectedExercises.length === 0) {
    return false
  }

  const importedTemplateExerciseIds = new Set(
    session.exercises
      .map((exercise) => exercise.templateExerciseId)
      .filter((templateExerciseId) => templateExerciseId !== null),
  )

  return selectedExercises.every((exercise) => importedTemplateExerciseIds.has(exercise.id))
}

export function useSchedulePageData() {
  const location = useLocation()
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [trainingCycle, setTrainingCycle] = useState<TrainingCycle | null>(null)
  const [currentSession, setCurrentSession] = useState<WorkoutSessionWithExercises | null>(null)
  const [templateSyncStatus, setTemplateSyncStatus] = useState<TemplateSyncStatus>({
    hasUpdates: false,
    templateName: null,
  })
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [newExerciseDraft, setNewExerciseDraft] = useState<ScheduleExerciseDraft>(emptyExerciseDraft)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const [templateItems, session, cycle] = await Promise.all([
      listTemplatesWithExercises(),
      getCurrentSession(),
      getTrainingCycle(),
    ])

    return {
      cycle,
      session,
      templateItems,
    }
  }, [])

  const loadData = useCallback(async (preferredTemplateId?: string | null) => {
    const { cycle, session, templateItems } = await fetchData()
    const nextTemplateSyncStatus = session
      ? await getSessionTemplateSyncStatus(session.id)
      : { hasUpdates: false, templateName: null }

    setTemplates(templateItems)
    setTrainingCycle(cycle)
    setCurrentSession(session)
    setTemplateSyncStatus(nextTemplateSyncStatus)
    setSelectedTemplateId((current) => {
      if (
        preferredTemplateId &&
        templateItems.some((template) => template.id === preferredTemplateId)
      ) {
        return preferredTemplateId
      }

      if (current && templateItems.some((template) => template.id === current)) {
        return current
      }

      return templateItems[0]?.id ?? null
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
        const { templateItems } = await fetchData()
        await loadData(templateItems[0]?.id ?? null)
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
        await loadData(selectedTemplateId)
      } catch (loadError) {
        console.error(loadError)
        setError('训练安排加载失败，请刷新页面后重试。')
      }
    }

    void refreshData()
  }, [isLoading, loadData, location.pathname, selectedTemplateId])

  async function handleAddTemplateExercises(templateId: string, templateExerciseIds?: string[]) {
    if (!currentSession) {
      return false
    }

    setSelectedTemplateId(templateId)

    const didSucceed = await runMutation(async () => {
      await addTemplateExercisesToSession(currentSession.id, templateId, templateExerciseIds)
      await loadData(templateId)
    })

    if (!didSucceed) {
      return null
    }

    const selectedTemplateExerciseIds = templateExerciseIds ? new Set(templateExerciseIds) : null
    const template = templates.find((item) => item.id === templateId)

    return template
      ? {
          count: template.exercises.filter((exercise) =>
            selectedTemplateExerciseIds ? selectedTemplateExerciseIds.has(exercise.id) : true,
          ).length,
          name: template.name,
        }
      : null
  }

  function getTemplateImportConfirmation(
    templateId: string,
    templateExerciseIds?: string[],
  ): TemplateImportConfirmation | null {
    if (!currentSession) {
      return null
    }

    const template = templates.find((item) => item.id === templateId)
    if (!template) {
      return null
    }

    const isDuplicateImport = hasImportedTemplateExercises(
      currentSession,
      template,
      templateExerciseIds,
    )
    const willContinueCompletedSession = currentSession.status === 'completed'

    if (!isDuplicateImport && !willContinueCompletedSession) {
      return null
    }

    return {
      isDuplicateImport,
      templateName: template.name,
      willContinueCompletedSession,
    }
  }

  async function handleAddTemporaryExercise() {
    if (!currentSession) {
      return false
    }

    return runMutation(async () => {
      await addTemporarySessionExercise(currentSession.id, {
        name: newExerciseDraft.name,
        targetSets: parseIntegerInput(newExerciseDraft.targetSets),
        restSeconds: parseIntegerInput(newExerciseDraft.restSeconds),
        defaultWeightKg: parseOptionalWeightKg(newExerciseDraft.weightKg),
        defaultReps: parseOptionalReps(newExerciseDraft.reps),
      })
      setNewExerciseDraft(emptyExerciseDraft)
      await loadData(selectedTemplateId)
    })
  }

  async function handleReorderExercises(orderedExerciseIds: string[]) {
    if (!currentSession) {
      return false
    }

    return runMutation(async () => {
      await reorderSessionExercises(currentSession.id, orderedExerciseIds)
      await loadData(selectedTemplateId)
    })
  }

  async function handleDeleteExercises(sessionExerciseIds: string[]) {
    if (!currentSession || sessionExerciseIds.length === 0) {
      return false
    }

    const didDelete = await runMutation(async () => {
      for (const sessionExerciseId of sessionExerciseIds) {
        await deletePendingSessionExercise(currentSession.id, sessionExerciseId)
      }
      await loadData(selectedTemplateId)
    })

    if (didDelete) {
      void triggerHaptic('warning')
    }

    return didDelete
  }

  async function handleSyncTemplate(): Promise<TemplateSyncResult | false> {
    if (!currentSession) {
      return false
    }

    let result: TemplateSyncResult | false = false
    const didSucceed = await runMutation(async () => {
      result = await syncSessionFromTemplate(currentSession.id)
      await loadData(selectedTemplateId)
    })

    return didSucceed ? result : false
  }

  const todayCycleDay = getTodayTrainingCycleDay(trainingCycle)
  const todayTemplate =
    todayCycleDay?.slot.templateId
      ? templates.find((template) => template.id === todayCycleDay.slot.templateId) ?? null
      : null
  const canAddTemporaryExercise = currentSession !== null
  const didAutoImportToday =
    currentSession !== null &&
    todayTemplate !== null &&
    currentSession.autoImportedTemplateId === todayTemplate.id &&
    currentSession.autoImportedAt !== null
  const shouldConfirmContinueBeforeAddingExercise = currentSession?.status === 'completed'
  const hasTemplates = templates.length > 0

  return {
    canAddTemporaryExercise,
    currentSession,
    didAutoImportToday,
    error,
    handleAddTemporaryExercise,
    handleAddTemplateExercises,
    handleDeleteExercises,
    handleReorderExercises,
    handleSyncTemplate,
    hasTemplates,
    getTemplateImportConfirmation,
    isLoading,
    isSubmitting,
    newExerciseDraft,
    selectedTemplateId,
    setNewExerciseDraft,
    setSelectedTemplateId,
    shouldConfirmContinueBeforeAddingExercise,
    templateSyncStatus,
    todayCycleDay,
    todayTemplate,
    trainingCycle,
    templates,
  }
}
