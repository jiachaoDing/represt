import { useEffect, useState } from 'react'

import {
  addTemplateExercisesToSession,
  addTemporarySessionExercise,
  deletePendingSessionExercise,
  getCurrentSession,
  getOrCreateTodaySession,
  type WorkoutSessionWithExercises,
} from '../../db/sessions'
import { listTemplatesWithExercises, type TemplateWithExercises } from '../../db/templates'
import { parseIntegerInput } from '../../lib/input-parsers'

export type ScheduleExerciseDraft = {
  name: string
  targetSets: string
  restSeconds: string
}

export type TemplateImportConfirmation = {
  isDuplicateImport: boolean
  templateName: string
  willContinueCompletedSession: boolean
}

const emptyExerciseDraft: ScheduleExerciseDraft = {
  name: '',
  targetSets: '3',
  restSeconds: '90',
}

function hasImportedTemplateExercises(
  session: WorkoutSessionWithExercises,
  template: TemplateWithExercises,
) {
  if (template.exercises.length === 0) {
    return false
  }

  const importedTemplateExerciseIds = new Set(
    session.exercises
      .map((exercise) => exercise.templateExerciseId)
      .filter((templateExerciseId) => templateExerciseId !== null),
  )

  return template.exercises.every((exercise) => importedTemplateExerciseIds.has(exercise.id))
}

export function useSchedulePageData() {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [currentSession, setCurrentSession] = useState<WorkoutSessionWithExercises | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [newExerciseDraft, setNewExerciseDraft] = useState<ScheduleExerciseDraft>(emptyExerciseDraft)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    const [templateItems, session] = await Promise.all([
      listTemplatesWithExercises(),
      getCurrentSession(),
    ])

    return {
      session,
      templateItems,
    }
  }

  async function loadData(preferredTemplateId?: string | null) {
    const { session, templateItems } = await fetchData()

    setTemplates(templateItems)
    setCurrentSession(session)
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
  }

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
  }, [])

  async function handleAddTemplateExercises(templateId: string) {
    if (!currentSession) {
      return false
    }

    setSelectedTemplateId(templateId)

    const didSucceed = await runMutation(async () => {
      await addTemplateExercisesToSession(currentSession.id, templateId)
      await loadData(templateId)
    })

    if (!didSucceed) {
      return null
    }

    const template = templates.find((item) => item.id === templateId)

    return template
      ? {
          count: template.exercises.length,
          name: template.name,
        }
      : null
  }

  function getTemplateImportConfirmation(templateId: string): TemplateImportConfirmation | null {
    if (!currentSession) {
      return null
    }

    const template = templates.find((item) => item.id === templateId)
    if (!template) {
      return null
    }

    const isDuplicateImport = hasImportedTemplateExercises(currentSession, template)
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
      })
      setNewExerciseDraft(emptyExerciseDraft)
      await loadData(selectedTemplateId)
    })
  }

  async function handleDeleteExercise(sessionExerciseId: string) {
    if (!currentSession) {
      return false
    }

    return runMutation(async () => {
      await deletePendingSessionExercise(currentSession.id, sessionExerciseId)
      await loadData(selectedTemplateId)
    })
  }

  const canAddTemporaryExercise = currentSession !== null
  const shouldConfirmContinueBeforeAddingExercise = currentSession?.status === 'completed'
  const hasTemplates = templates.length > 0

  return {
    canAddTemporaryExercise,
    currentSession,
    error,
    handleAddTemporaryExercise,
    handleAddTemplateExercises,
    handleDeleteExercise,
    hasTemplates,
    getTemplateImportConfirmation,
    isLoading,
    isSubmitting,
    newExerciseDraft,
    selectedTemplateId,
    setNewExerciseDraft,
    setSelectedTemplateId,
    shouldConfirmContinueBeforeAddingExercise,
    templates,
  }
}
