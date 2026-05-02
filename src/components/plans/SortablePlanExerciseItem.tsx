import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { verticalSortTransition } from '../dnd/vertical-sortable-motion'
import { usePrimaryTabLongPressSwipeLock } from '../layout/PrimaryTabSwipeContext'
import { getDisplayExerciseName } from '../../lib/exercise-name'
import { PlanExerciseCard } from './PlanExerciseCard'
import type { SortablePlanExerciseItemProps } from './plan-exercise-list.types'

export function SortablePlanExerciseItem({
  exercise,
  isSelected,
  index,
  isSelectionMode,
  isSorting,
  isSubmitting,
  onEdit,
  onToggleSelected,
  registerItemRef,
}: SortablePlanExerciseItemProps) {
  const { t } = useTranslation()
  const displayName = getDisplayExerciseName(t, exercise)
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
    disabled: isSubmitting || isSelectionMode,
    transition: verticalSortTransition,
  })

  const style: CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
    touchAction: 'manipulation',
  }

  return (
    <div
      ref={(element) => {
        setNodeRef(element)
        setActivatorNodeRef(element)
        registerItemRef(exercise.id, element)
      }}
      style={style}
      {...swipeLockHandlers}
      className={[
        isDragging ? 'relative opacity-0 pointer-events-none' : 'relative',
        isSubmitting ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      ].join(' ')}
      aria-label={t('plans.dragExercise', { name: displayName })}
      onClick={isSelectionMode ? () => onToggleSelected(exercise.id) : undefined}
      {...attributes}
      {...listeners}
    >
      <PlanExerciseCard
        exercise={exercise}
        index={index}
        isDragging={isDragging}
        isSelected={isSelected}
        isSubmitting={isSubmitting || isSorting}
        onEdit={onEdit}
        selectionMode={isSelectionMode}
      />
    </div>
  )
}
