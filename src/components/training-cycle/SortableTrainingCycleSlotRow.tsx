import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { verticalSortTransition } from '../dnd/vertical-sortable-motion'
import { TrainingCycleSlotRow } from './TrainingCycleSlotRow'
import type { TrainingCycleSlotRowProps } from './training-cycle-page.types'

export function SortableTrainingCycleSlotRow(props: TrainingCycleSlotRowProps) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.slot.id,
    disabled: props.isSubmitting,
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
      }}
      style={style}
      className={[
        isDragging ? 'relative opacity-0 pointer-events-none' : 'relative',
        props.isSubmitting ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      ].join(' ')}
      aria-label={`长按拖动调整第 ${props.index + 1} 天顺序`}
      {...attributes}
      {...listeners}
    >
      <TrainingCycleSlotRow {...props} isDragging={isDragging} />
    </div>
  )
}
