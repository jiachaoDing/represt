import type { CSSProperties, KeyboardEvent } from 'react'
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
  onCopy,
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

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (
      isSubmitting ||
      event.target !== event.currentTarget ||
      (event.key !== 'Enter' && event.key !== ' ')
    ) {
      return
    }

    event.preventDefault()
    if (isSelectionMode) {
      onToggleSelected(exercise.id)
      return
    }

    onEdit(exercise.id)
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
        isSubmitting ? 'cursor-default' : 'cursor-pointer active:cursor-grabbing',
      ].join(' ')}
      aria-label={t(isSelectionMode ? 'plans.dragExercise' : 'plans.editExercise', {
        name: displayName,
      })}
      onClick={
        isSelectionMode
          ? () => onToggleSelected(exercise.id)
          : isSubmitting
          ? undefined
          : () => onEdit(exercise.id)
      }
      {...attributes}
      {...listeners}
      onKeyDown={handleKeyDown}
    >
      <PlanExerciseCard
        exercise={exercise}
        index={index}
        isDragging={isDragging}
        isSelected={isSelected}
        isSubmitting={isSubmitting || isSorting}
        onCopy={onCopy}
        selectionMode={isSelectionMode}
      />
    </div>
  )
}
