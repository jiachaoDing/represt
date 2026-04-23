import { useEffect, useState } from 'react'

import {
  addTemporarySessionExercise,
  createOrRebuildCurrentSession,
  deletePendingSessionExercise,
  getCurrentSession,
  type WorkoutSessionWithExercises,
} from '../../db/sessions'
import { listTemplatesWithExercises, type TemplateWithExercises } from '../../db/templates'
import { parseIntegerInput } from '../../lib/input-parsers'

export type ScheduleExerciseDraft = {
  name: string
  targetSets: string
  restSeconds: string
}

const emptyExerciseDraft: ScheduleExerciseDraft = {
  name: '',
  targetSets: '3',
  restSeconds: '90',
}

export function useSchedulePageData() {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [currentSession, setCurrentSession] = useState<WorkoutSessionWithExercises | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [newExerciseDraft, setNewExerciseDraft] = useState<ScheduleExerciseDraft>(emptyExerciseDraft)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadData(preferredTemplateId?: string | null) {
    const [templateItems, session] = await Promise.all([
      listTemplatesWithExercises(),
      getCurrentSession(),
    ])

    setTemplates(templateItems)
    setCurrentSession(session)
    setSelectedTemplateId((current) => {
      if (session?.templateId && templateItems.some((template) => template.id === session.templateId)) {
        return session.templateId
      }

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
    } catch (mutationError) {
      console.error(mutationError)
      setError(
        mutationError instanceof Error ? mutationError.message : '训练安排保存失败，请重试。',
      )
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
        setError('训练安排加载失败，请刷新页面后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [])

  async function handleCreateOrRebuildSession() {
    if (!selectedTemplateId) {
      return
    }

    await runMutation(async () => {
      await createOrRebuildCurrentSession(selectedTemplateId)
      await loadData(selectedTemplateId)
    })
  }

  async function handleAddTemporaryExercise() {
    if (!currentSession) {
      return
    }

    await runMutation(async () => {
      await addTemporarySessionExercise(currentSession.id, {
        name: newExerciseDraft.name,
        targetSets: parseIntegerInput(newExerciseDraft.targetSets),
        restSeconds: parseIntegerInput(newExerciseDraft.restSeconds),
      })
      setNewExerciseDraft(emptyExerciseDraft)
      await loadData(currentSession.templateId)
    })
  }

  async function handleDeleteExercise(sessionExerciseId: string) {
    if (!currentSession) {
      return
    }

    if (!window.confirm('删除后不会回写模板。确定删除这个本次训练动作吗？')) {
      return
    }

    await runMutation(async () => {
      await deletePendingSessionExercise(currentSession.id, sessionExerciseId)
      await loadData(currentSession.templateId)
    })
  }

  const currentTemplate = currentSession
    ? templates.find((template) => template.id === currentSession.templateId) ?? null
    : null
  const canChangeTemplate = currentSession === null || currentSession.status === 'pending'
  const canAddTemporaryExercise = currentSession !== null && currentSession.status !== 'completed'
  const hasTemplates = templates.length > 0
  const needsRebuild =
    currentSession?.status === 'pending' &&
    selectedTemplateId !== null &&
    currentSession.templateId !== selectedTemplateId

  let sessionActionLabel = '创建本次训练'
  if (currentSession && currentSession.status === 'pending') {
    sessionActionLabel = needsRebuild ? '按新模板重建' : '重建当前训练'
  }
  if (currentSession && currentSession.status !== 'pending') {
    sessionActionLabel = '当前训练已开始'
  }

  return {
    canAddTemporaryExercise,
    canChangeTemplate,
    currentSession,
    currentTemplate,
    error,
    handleAddTemporaryExercise,
    handleCreateOrRebuildSession,
    handleDeleteExercise,
    hasTemplates,
    isLoading,
    isSubmitting,
    needsRebuild,
    newExerciseDraft,
    selectedTemplateId,
    sessionActionLabel,
    setNewExerciseDraft,
    setSelectedTemplateId,
    templates,
  }
}
