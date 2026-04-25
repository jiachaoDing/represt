import type { FormEvent } from 'react'

import type { TemplateWithExercises } from '../../db/templates'
import type { TemplateExerciseDraft } from '../../lib/template-editor'
import type { TemplateExercise } from '../../models/types'

export type TemplateExerciseListProps = {
  currentTemplate: TemplateWithExercises | null
  draft: TemplateExerciseDraft
  editExerciseId: string | null
  isCreatingExercise: boolean
  isLoading: boolean
  isSubmitting: boolean
  pendingScrollExerciseId: string | null
  templatesCount: number
  onCancelEditing: () => void
  onCreate: () => void
  onDelete: (exerciseId: string) => void
  onOpenBatchDelete: () => void
  onDraftChange: (draft: TemplateExerciseDraft) => void
  onEdit: (exerciseId: string) => void
  onReorder: (orderedExerciseIds: string[]) => Promise<boolean>
  onScrollAnimationComplete: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export type TemplateExerciseCardProps = {
  exercise: TemplateExercise
  index: number
  isDragging?: boolean
  isSubmitting: boolean
  onDelete?: (exerciseId: string) => void
  onEdit?: (exerciseId: string) => void
}

export type SortableTemplateExerciseItemProps = {
  exercise: TemplateExercise
  index: number
  isSorting: boolean
  isSubmitting: boolean
  onDelete: (exerciseId: string) => void
  onEdit: (exerciseId: string) => void
  registerItemRef: (exerciseId: string, element: HTMLDivElement | null) => void
}
