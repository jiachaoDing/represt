import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

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
    transition: {
      duration: 220,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  })

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 20 : 'auto',
  }

  return (
    <div
      ref={(element) => {
        setNodeRef(element)
        registerItemRef(exercise.id, element)
      }}
      style={style}
      className={isDragging ? 'relative opacity-0' : 'relative'}
    >
      <TemplateExerciseCard
        exercise={exercise}
        index={index}
        isDragging={isDragging}
        isSubmitting={isSubmitting || isSorting}
        onDelete={onDelete}
        onEdit={onEdit}
        dragHandleProps={{
          attributes,
          listeners,
          setActivatorNodeRef,
        }}
      />
    </div>
  )
}
