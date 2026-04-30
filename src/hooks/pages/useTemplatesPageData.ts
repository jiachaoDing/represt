import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  createTemplate,
  createTemplateExercise,
  deleteTemplate,
  deleteTemplateExercise,
  importTemplateExercises,
  listTemplatesWithExercises,
  reorderTemplateExercises,
  updateTemplateExercise,
  updateTemplateName,
  type TemplateWithExercises,
} from '../../db/templates'
import {
  getTodayTrainingCycleDay,
  getTrainingCycle,
  getTrainingCycleTemplateDaysUntil,
  getTrainingCycleTemplateIndexes,
} from '../../db/training-cycle'
import {
  parseOptionalDistanceMeters,
  parseOptionalDurationSeconds,
  parseIntegerInput,
  parseOptionalReps,
  parseOptionalWeightKg,
} from '../../lib/input-parsers'
import { triggerHaptic } from '../../lib/haptics'
import type { TemplateExerciseDraft } from '../../lib/template-editor'
import type { TrainingCycle } from '../../models/types'

export function useTemplatesPageData() {
  const { t } = useTranslation()
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [trainingCycle, setTrainingCycle] = useState<TrainingCycle | null>(null)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [lastCreatedExerciseId, setLastCreatedExerciseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function loadTemplates(preferredTemplateId?: string | null) {
    const [items, cycle] = await Promise.all([listTemplatesWithExercises(), getTrainingCycle()])
    setTemplates(items)
    setTrainingCycle(cycle)
    setSelectedTemplateId((current) => {
      if (preferredTemplateId !== undefined) {
        return items.some((template) => template.id === preferredTemplateId)
          ? preferredTemplateId
          : (items[0]?.id ?? null)
      }

      return items.some((template) => template.id === current) ? current : (items[0]?.id ?? null)
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
      setError(t('templates.saveFailed'))
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
        await loadTemplates()
      } catch (loadError) {
        console.error(loadError)
        setError(t('templates.loadFailed'))
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [t])

  async function handleCreateTemplate() {
    const didCreate = await runMutation(async () => {
      const template = await createTemplate(newTemplateName || t('common.unnamedTemplate'))
      setNewTemplateName('')
      await loadTemplates(template.id)
    })

    if (didCreate) {
      void triggerHaptic('success')
    }

    return didCreate
  }

  async function handleSaveTemplateName(templateId: string, name: string) {
    const didSave = await runMutation(async () => {
      await updateTemplateName(templateId, name || t('common.unnamedTemplate'))
      await loadTemplates(templateId)
    })

    if (didSave) {
      void triggerHaptic('success')
    }

    return didSave
  }

  async function handleDeleteTemplate(templateId: string) {
    const didDelete = await runMutation(async () => {
      await deleteTemplate(templateId)
      await loadTemplates()
    })

    if (didDelete) {
      void triggerHaptic('warning')
    }

    return didDelete
  }

  async function handleCreateExercise(templateId: string, draft: TemplateExerciseDraft) {
    return runMutation(async () => {
      const exercise = await createTemplateExercise(templateId, {
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
      await loadTemplates(templateId)
    })
  }

  async function handleImportExercises(templateId: string, exerciseIds: string[]) {
    const didImport = await runMutation(async () => {
      const importedExercises = await importTemplateExercises(templateId, exerciseIds)
      setLastCreatedExerciseId(importedExercises.at(-1)?.id ?? null)
      await loadTemplates(templateId)
    })

    if (didImport) {
      void triggerHaptic('success')
    }

    return didImport
  }

  async function handleSaveExercise(
    templateId: string,
    exerciseId: string,
    draft: TemplateExerciseDraft,
  ) {
    return runMutation(async () => {
      await updateTemplateExercise(exerciseId, {
        name: draft.name || t('common.unnamedExercise'),
        catalogExerciseId: draft.catalogExerciseId,
        targetSets: parseIntegerInput(draft.targetSets),
        restSeconds: parseIntegerInput(draft.restSeconds),
        weightKg: parseOptionalWeightKg(draft.weightKg),
        reps: parseOptionalReps(draft.reps),
        durationSeconds: parseOptionalDurationSeconds(draft.durationSeconds),
        distanceMeters: parseOptionalDistanceMeters(draft.distanceMeters),
      })
      await loadTemplates(templateId)
    })
  }

  async function handleDeleteExercises(templateId: string, exerciseIds: string[]) {
    if (exerciseIds.length === 0) {
      return false
    }

    const didDelete = await runMutation(async () => {
      for (const exerciseId of exerciseIds) {
        await deleteTemplateExercise(exerciseId)
      }
      await loadTemplates(templateId)
    })

    if (didDelete) {
      void triggerHaptic('warning')
    }

    return didDelete
  }

  async function handleReorderExercises(templateId: string, orderedExerciseIds: string[]) {
    return runMutation(async () => {
      await reorderTemplateExercises(templateId, orderedExerciseIds)
      await loadTemplates(templateId)
    })
  }

  const currentTemplate =
    templates.find((template) => template.id === selectedTemplateId) ?? null
  const todayCycleDay = useMemo(() => getTodayTrainingCycleDay(trainingCycle), [trainingCycle])
  const todayTemplate = useMemo(() => {
    if (!todayCycleDay?.slot.templateId) {
      return null
    }

    return templates.find((template) => template.id === todayCycleDay.slot.templateId) ?? null
  }, [templates, todayCycleDay])
  const currentTemplateCyclePreview = useMemo(() => {
    if (!currentTemplate) {
      return null
    }

    return {
      daysUntil: getTrainingCycleTemplateDaysUntil(trainingCycle, currentTemplate.id),
      slotIndexes: getTrainingCycleTemplateIndexes(trainingCycle, currentTemplate.id),
    }
  }, [currentTemplate, trainingCycle])

  return {
    clearLastCreatedExerciseId: () => setLastCreatedExerciseId(null),
    currentTemplate,
    currentTemplateCyclePreview,
    error,
    handleCreateExercise,
    handleCreateTemplate,
    handleDeleteExercises,
    handleDeleteTemplate,
    handleImportExercises,
    handleReorderExercises,
    handleSaveExercise,
    handleSaveTemplateName,
    isLoading,
    isSubmitting,
    lastCreatedExerciseId,
    newTemplateName,
    setNewTemplateName,
    selectedTemplateId,
    setSelectedTemplateId,
    todayCycleDay,
    todayTemplate,
    trainingCycle,
    templates,
  }
}
