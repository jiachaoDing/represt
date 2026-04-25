import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { WorkoutSessionWithExercises } from '../../db/sessions'
import { useBackLinkState } from '../../hooks/useRouteBack'
import { SwipeActionItem } from '../ui/SwipeActionItem'
import { ScheduleExerciseCard } from './ScheduleExerciseCard'
import { verticalSortTransition } from '../dnd/vertical-sortable-motion'

type SortableScheduleExerciseItemProps = {
  exercise: WorkoutSessionWithExercises['exercises'][number]
  index: number
  isSorting: boolean
  isSubmitting: boolean
  now: number
  onDelete: (exerciseId: string) => void
}

export function SortableScheduleExerciseItem({
  exercise,
  index,
  isSorting,
  isSubmitting,
  now,
  onDelete,
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
    disabled: isSubmitting,
    transition: verticalSortTransition,
  })

  const style: CSSProperties = {
    transform: isDragging ? undefined : CSS.Transform.toString(transform),
    transition,
    touchAction: 'manipulation',
  }
  const canDelete = exercise.status === 'pending' && exercise.completedSets === 0

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
      {...attributes}
      {...listeners}
    >
      <SwipeActionItem
        actionLabel="删除"
        disabled={!canDelete || isSorting || isSubmitting || isDragging}
        onAction={() => onDelete(exercise.id)}
        requireLongPress
      >
        <ScheduleExerciseCard
          exercise={exercise}
          href={`/exercise/${exercise.id}`}
          index={index}
          isDragging={isDragging}
          isSubmitting={isSubmitting || isSorting}
          linkState={backLinkState}
          now={now}
        />
      </SwipeActionItem>
    </div>
  )
}
