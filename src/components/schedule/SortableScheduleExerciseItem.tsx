import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { WorkoutSessionWithExercises } from '../../db/sessions'
import { useBackLinkState } from '../../hooks/useRouteBack'
import { ScheduleExerciseCard } from './ScheduleExerciseCard'
import { verticalSortTransition } from '../dnd/vertical-sortable-motion'

type SortableScheduleExerciseItemProps = {
  exercise: WorkoutSessionWithExercises['exercises'][number]
  isSelected: boolean
  index: number
  isSelectionMode: boolean
  isSorting: boolean
  isSubmitting: boolean
  now: number
  onToggleSelected: (exerciseId: string) => void
}

export function SortableScheduleExerciseItem({
  exercise,
  isSelected,
  index,
  isSelectionMode,
  isSorting,
  isSubmitting,
  now,
  onToggleSelected,
}: SortableScheduleExerciseItemProps) {
  const backLinkState = useBackLinkState()
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
  const canSelect = exercise.status === 'pending' && exercise.completedSets === 0

  return (
    <div
      ref={(element) => {
        setNodeRef(element)
        setActivatorNodeRef(element)
      }}
      style={style}
      className={[
        isDragging ? 'relative opacity-0 pointer-events-none' : 'relative',
        isSubmitting ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      ].join(' ')}
      aria-label={`长按拖动调整“${exercise.name}”顺序`}
      onClick={isSelectionMode && canSelect ? () => onToggleSelected(exercise.id) : undefined}
      {...attributes}
      {...listeners}
    >
      <ScheduleExerciseCard
        exercise={exercise}
        href={isSelectionMode ? undefined : `/exercise/${exercise.id}`}
        index={index}
        isDragging={isDragging}
        isSelected={isSelected}
        isSubmitting={isSubmitting || isSorting}
        linkState={backLinkState}
        now={now}
        selectionMode={isSelectionMode}
      />
    </div>
  )
}
