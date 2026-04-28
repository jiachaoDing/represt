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
  templates: TemplateWithExercises[]
  templatesCount: number
  onCancelEditing: () => void
  onCreate: () => void
  onDeleteSelected: (exerciseIds: string[]) => Promise<boolean>
  onDraftChange: (draft: TemplateExerciseDraft) => void
  onEdit: (exerciseId: string) => void
  onImport: (exerciseIds: string[]) => Promise<boolean>
  onReorder: (orderedExerciseIds: string[]) => Promise<boolean>
  onScrollAnimationComplete: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export type TemplateExerciseCardProps = {
  exercise: TemplateExercise
  index: number
  isDragging?: boolean
  isSelected?: boolean
  isSubmitting: boolean
  selectionMode?: boolean
  onEdit?: (exerciseId: string) => void
}

export type SortableTemplateExerciseItemProps = {
  exercise: TemplateExercise
  isSelected: boolean
  index: number
  isSelectionMode: boolean
  isSorting: boolean
  isSubmitting: boolean
  onEdit: (exerciseId: string) => void
  onToggleSelected: (exerciseId: string) => void
  registerItemRef: (exerciseId: string, element: HTMLDivElement | null) => void
}
