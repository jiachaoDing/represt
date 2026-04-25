import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { verticalSortTransition } from '../dnd/vertical-sortable-motion'
import { TemplateExerciseCard } from './TemplateExerciseCard'
import type { SortableTemplateExerciseItemProps } from './template-exercise-list.types'

export function SortableTemplateExerciseItem({
  exercise,
  isSelected,
  index,
  isSelectionMode,
  isSorting,
  isSubmitting,
  onEdit,
  onToggleSelected,
  registerItemRef,
}: SortableTemplateExerciseItemProps) {
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
      className={[
        isDragging ? 'relative opacity-0 pointer-events-none' : 'relative',
        isSubmitting ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      ].join(' ')}
      aria-label={`长按拖动调整“${exercise.name}”顺序`}
      onClick={isSelectionMode ? () => onToggleSelected(exercise.id) : undefined}
      {...attributes}
      {...listeners}
    >
      <TemplateExerciseCard
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
