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
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadTemplates(preferredTemplateId?: string | null) {
    const items = await listTemplatesWithExercises()
    setTemplates(items)
    setExpandedTemplateId((current) => {
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
    } catch (mutationError) {
      console.error(mutationError)
      setError('模板数据保存失败，请重试。')
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
    await runMutation(async () => {
      const template = await createTemplate(newTemplateName)
      setNewTemplateName('')
      await loadTemplates(template.id)
    })
  }

  async function handleSaveTemplateName(templateId: string, name: string) {
    await runMutation(async () => {
      await updateTemplateName(templateId, name)
      await loadTemplates(templateId)
    })
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!window.confirm('删除模板后，该模板下的动作也会一起删除。确定继续吗？')) {
      return
    }

    await runMutation(async () => {
      await deleteTemplate(templateId)
      await loadTemplates()
    })
  }

  async function handleCreateExercise(templateId: string, draft: TemplateExerciseDraft) {
    await runMutation(async () => {
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
    await runMutation(async () => {
      await updateTemplateExercise(exerciseId, {
        name: draft.name,
        targetSets: parseIntegerInput(draft.targetSets),
        restSeconds: parseIntegerInput(draft.restSeconds),
      })
      await loadTemplates(templateId)
    })
  }

  async function handleDeleteExercise(templateId: string, exerciseId: string) {
    await runMutation(async () => {
      await deleteTemplateExercise(exerciseId)
      await loadTemplates(templateId)
    })
  }

  return {
    error,
    expandedTemplateId,
    handleCreateExercise,
    handleCreateTemplate,
    handleDeleteExercise,
    handleDeleteTemplate,
    handleSaveExercise,
    handleSaveTemplateName,
    isLoading,
    isSubmitting,
    newTemplateName,
    setExpandedTemplateId,
    setNewTemplateName,
    templates,
  }
}
