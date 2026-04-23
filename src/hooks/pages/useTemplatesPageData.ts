import { useEffect, useState } from 'react'

import {
  createTemplate,
  createTemplateExercise,
  deleteTemplate,
  deleteTemplateExercise,
  listTemplatesWithExercises,
  updateTemplateExercise,
  updateTemplateName,
  type TemplateWithExercises,
} from '../../db/templates'
import { parseIntegerInput } from '../../lib/input-parsers'
import type { TemplateExerciseDraft } from '../../lib/template-editor'

export function useTemplatesPageData() {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [newTemplateName, setNewTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadTemplates(preferredTemplateId?: string | null) {
    const items = await listTemplatesWithExercises()
    setTemplates(items)
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
      setError('模板数据保存失败，请重试。')
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
        setError('模板数据加载失败，请刷新页面后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [])

  async function handleCreateTemplate() {
    return runMutation(async () => {
      const template = await createTemplate(newTemplateName)
      setNewTemplateName('')
      await loadTemplates(template.id)
    })
  }

  async function handleSaveTemplateName(templateId: string, name: string) {
    return runMutation(async () => {
      await updateTemplateName(templateId, name)
      await loadTemplates(templateId)
    })
  }

  async function handleDeleteTemplate(templateId: string) {
    return runMutation(async () => {
      await deleteTemplate(templateId)
      await loadTemplates()
    })
  }

  async function handleCreateExercise(templateId: string, draft: TemplateExerciseDraft) {
    return runMutation(async () => {
      await createTemplateExercise(templateId, {
        name: draft.name,
        targetSets: parseIntegerInput(draft.targetSets),
        restSeconds: parseIntegerInput(draft.restSeconds),
      })
      await loadTemplates(templateId)
    })
  }

  async function handleSaveExercise(
    templateId: string,
    exerciseId: string,
    draft: TemplateExerciseDraft,
  ) {
    return runMutation(async () => {
      await updateTemplateExercise(exerciseId, {
        name: draft.name,
        targetSets: parseIntegerInput(draft.targetSets),
        restSeconds: parseIntegerInput(draft.restSeconds),
      })
      await loadTemplates(templateId)
    })
  }

  async function handleDeleteExercise(templateId: string, exerciseId: string) {
    return runMutation(async () => {
      await deleteTemplateExercise(exerciseId)
      await loadTemplates(templateId)
    })
  }

  return {
    currentTemplate:
      templates.find((template) => template.id === selectedTemplateId) ?? null,
    error,
    handleCreateExercise,
    handleCreateTemplate,
    handleDeleteExercise,
    handleDeleteTemplate,
    handleSaveExercise,
    handleSaveTemplateName,
    isLoading,
    isSubmitting,
    newTemplateName,
    setNewTemplateName,
    selectedTemplateId,
    setSelectedTemplateId,
    templates,
  }
}
