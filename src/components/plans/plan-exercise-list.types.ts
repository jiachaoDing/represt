import type { FormEvent } from 'react'

import type { PlanWithExercises } from '../../db/plans'
import type { PlanExerciseDraft } from '../../lib/plan-editor'
import type { PlanExercise } from '../../models/types'

export type PlanExerciseListProps = {
  currentPlan: PlanWithExercises | null
  draft: PlanExerciseDraft
  editExerciseId: string | null
  isCreatingExercise: boolean
  isLoading: boolean
  isSubmitting: boolean
  pendingScrollExerciseId: string | null
  plans: PlanWithExercises[]
  plansCount: number
  onCancelEditing: () => void
  onCreate: () => void
  onDeleteSelected: (exerciseIds: string[]) => Promise<boolean>
  onDraftChange: (draft: PlanExerciseDraft) => void
  onEdit: (exerciseId: string) => void
  onImport: (exerciseIds: string[]) => Promise<boolean>
  onReorder: (orderedExerciseIds: string[]) => Promise<boolean>
  onScrollAnimationComplete: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export type PlanExerciseCardProps = {
  exercise: PlanExercise
  index: number
  isDragging?: boolean
  isSelected?: boolean
  isSubmitting: boolean
  selectionMode?: boolean
  onEdit?: (exerciseId: string) => void
}

export type SortablePlanExerciseItemProps = {
  exercise: PlanExercise
  isSelected: boolean
  index: number
  isSelectionMode: boolean
  isSorting: boolean
  isSubmitting: boolean
  onEdit: (exerciseId: string) => void
  onToggleSelected: (exerciseId: string) => void
  registerItemRef: (exerciseId: string, element: HTMLDivElement | null) => void
}
