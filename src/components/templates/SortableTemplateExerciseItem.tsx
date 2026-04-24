import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { verticalSortTransition } from '../dnd/vertical-sortable-motion'
import { TemplateExerciseCard } from './TemplateExerciseCard'
import type { SortableTemplateExerciseItemProps } from './template-exercise-list.types'

export function SortableTemplateExerciseItem({
  exercise,
  index,
  isSorting,
  isSubmitting,
  onDelete,
  onEdit,
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
    disabled: isSubmitting,
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
      {...attributes}
      {...listeners}
    >
      <TemplateExerciseCard
        exercise={exercise}
        index={index}
        isDragging={isDragging}
        isSubmitting={isSubmitting || isSorting}
        onDelete={onDelete}
        onEdit={onEdit}
      />
    </div>
  )
}
