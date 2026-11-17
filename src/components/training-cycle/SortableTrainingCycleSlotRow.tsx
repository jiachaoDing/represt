import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { useTranslation } from 'react-i18next'
import { animate, motion, useMotionValue, useReducedMotion, type MotionValue } from 'framer-motion'

import { verticalSortTransition } from '../dnd/vertical-sortable-motion'
import { TrainingCycleSlotRow } from './TrainingCycleSlotRow'
import { TrainingCycleWheelItem } from './TrainingCycleWheelItem'
import type { TrainingCycleSlotRowProps } from './training-cycle-page.types'
import { rebaseCycleWheelOffset } from './training-cycle-wheel-geometry'

export function SortableTrainingCycleSlotRow({ wheelScrollTop, wheelViewportHeight, ...props }: TrainingCycleSlotRowProps & {
  wheelScrollTop: MotionValue<number>
  wheelViewportHeight: MotionValue<number>
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const y = useMotionValue(0)
  const zIndex = useMotionValue(0)
  const previousIndex = useRef(props.index)
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({
    id: props.slot.id,
    disabled: props.isSubmitting,
    transition: verticalSortTransition,
    animateLayoutChanges: () => false,
  })
  const targetY = transform?.y ?? 0

  useLayoutEffect(() => {
    // Reordering changes the DOM origin. Preserve the rendered position even
    // when a neighbouring row has not finished making room yet.
    y.set(rebaseCycleWheelOffset(y.get(), previousIndex.current, props.index))
    previousIndex.current = props.index
    if (isDragging || reduceMotion) {
      zIndex.set(isDragging ? 20 : 0)
      y.set(targetY)
      return
    }
    const animation = animate(y, targetY, {
      duration: verticalSortTransition.duration / 1000,
      ease: [0.2, 0, 0, 1],
      onComplete: () => zIndex.set(0),
    })
    return () => animation.stop()
  }, [isDragging, props.index, reduceMotion, targetY, y, zIndex])

  const style: CSSProperties = {
    touchAction: 'manipulation',
    scrollSnapAlign: 'center',
  }

  return (
    <motion.div
      ref={(element) => {
        setNodeRef(element)
        setActivatorNodeRef(element)
      }}
      style={{ ...style, y, zIndex }}
      className={[
        'relative',
        props.isSubmitting ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
      ].join(' ')}
      aria-label={t('trainingCycle.dragDay', { dayNumber: props.index + 1 })}
      {...attributes}
      {...listeners}
    >
      <TrainingCycleWheelItem index={props.index} offsetY={y} scrollTop={wheelScrollTop} viewportHeight={wheelViewportHeight}>
        <TrainingCycleSlotRow {...props} isDragging={isDragging} />
      </TrainingCycleWheelItem>
    </motion.div>
  )
}
