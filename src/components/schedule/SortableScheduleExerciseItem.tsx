import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { WorkoutSessionWithExercises } from '../../db/sessions'
import { SwipeActionItem } from '../ui/SwipeActionItem'
import { ScheduleExerciseCard } from './ScheduleExerciseCard'

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
  const canDelete = exercise.status === 'pending' && exercise.completedSets === 0

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? 'relative opacity-0' : 'relative'}>
      <SwipeActionItem
        actionLabel="删除"
        disabled={!canDelete || isSorting || isSubmitting || isDragging}
        onAction={() => onDelete(exercise.id)}
      >
        <ScheduleExerciseCard
          exercise={exercise}
          href={`/exercise/${exercise.id}`}
          index={index}
          isDragging={isDragging}
          isSubmitting={isSubmitting || isSorting}
          now={now}
          dragHandleProps={{
            attributes,
            listeners,
            setActivatorNodeRef,
          }}
        />
      </SwipeActionItem>
    </div>
  )
}
