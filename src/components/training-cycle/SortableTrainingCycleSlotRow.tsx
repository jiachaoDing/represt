import type { CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTranslation } from 'react-i18next'
import type { MotionValue } from 'framer-motion'

import { verticalSortTransition } from '../dnd/vertical-sortable-motion'
import { TrainingCycleSlotRow } from './TrainingCycleSlotRow'
import { TrainingCycleWheelItem } from './TrainingCycleWheelItem'
import type { TrainingCycleSlotRowProps } from './training-cycle-page.types'

export function SortableTrainingCycleSlotRow({ wheelScrollTop, wheelViewportHeight, ...props }: TrainingCycleSlotRowProps & {
  wheelScrollTop: MotionValue<number>
  wheelViewportHeight: MotionValue<number>
}) {
  const { t } = useTranslation()
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
    scrollSnapAlign: 'center',
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
      aria-label={t('trainingCycle.dragDay', { dayNumber: props.index + 1 })}
      {...attributes}
      {...listeners}
    >
      <TrainingCycleWheelItem index={props.index} scrollTop={wheelScrollTop} viewportHeight={wheelViewportHeight}>
        <TrainingCycleSlotRow {...props} isDragging={isDragging} />
      </TrainingCycleWheelItem>
    </div>
  )
}
