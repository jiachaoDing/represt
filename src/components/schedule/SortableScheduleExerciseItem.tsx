import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { WorkoutSessionWithExercises } from '../../db/sessions'
import { useBackLinkState } from '../../hooks/useRouteBack'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import { ScheduleExerciseCard } from './ScheduleExerciseCard'
import { usePrimaryTabLongPressSwipeLock } from '../layout/PrimaryTabSwipeContext'
import { verticalSortTransition } from '../dnd/vertical-sortable-motion'

type SortableScheduleExerciseItemProps = {
  exercise: WorkoutSessionWithExercises['exercises'][number]
  isSelected: boolean
  isEditMode: boolean
  index: number
  isSelectionMode: boolean
  isSorting: boolean
  isSubmitting: boolean
  now: number
  onEdit: (exerciseId: string) => void
  onToggleSelected: (exerciseId: string) => void
}

export function SortableScheduleExerciseItem({
  exercise,
  isSelected,
  isEditMode,
  index,
  isSelectionMode,
  isSorting,
  isSubmitting,
  now,
  onEdit,
  onToggleSelected,
}: SortableScheduleExerciseItemProps) {
  const { t } = useTranslation()
  const displayName = getDisplayExerciseName(t, exercise)
  const backLinkState = useBackLinkState()
  const swipeLockHandlers = usePrimaryTabLongPressSwipeLock(isSubmitting || isSelectionMode)
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: exercise.id,
    disabled: isSubmitting || isSelectionMode || isEditMode,
    transition: verticalSortTransition,
  })

  const style: CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
    touchAction: 'manipulation',
  }
  const canSelect = true
  const interactionClassName = isSelectionMode
    ? canSelect
      ? 'cursor-pointer'
      : 'cursor-not-allowed'
    : isEditMode
    ? 'cursor-default'
    : isSubmitting
    ? 'cursor-default'
    : 'cursor-grab active:cursor-grabbing'

  return (
    <div
      ref={(element) => {
        setNodeRef(element)
        setActivatorNodeRef(element)
      }}
      style={style}
      {...swipeLockHandlers}
      className={[
        isDragging ? 'relative opacity-0 pointer-events-none' : 'relative',
        interactionClassName,
      ].join(' ')}
      aria-label={t('plans.dragExercise', { name: displayName })}
      onClick={isSelectionMode && canSelect ? () => onToggleSelected(exercise.id) : undefined}
      {...attributes}
      {...listeners}
    >
      <ScheduleExerciseCard
        exercise={exercise}
        href={isSelectionMode || isEditMode ? undefined : `/exercise/${exercise.id}`}
        index={index}
        isDragging={isDragging}
        isSelectable={canSelect}
        isSelected={isSelected}
        isSubmitting={isSubmitting || isSorting}
        linkState={backLinkState}
        now={now}
        onEdit={isEditMode ? () => onEdit(exercise.id) : undefined}
        selectionMode={isSelectionMode}
      />
    </div>
  )
}
