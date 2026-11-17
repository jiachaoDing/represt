import type { ReactNode } from 'react'
import { motion, useReducedMotion, useTransform, type MotionStyle, type MotionValue } from 'framer-motion'

import { cycleWheelRowHeight, getCycleWheelGeometry } from './training-cycle-wheel-geometry'
import { getCycleOrbitEmphasis } from './cycle-orbit-tokens'

type TrainingCycleWheelItemProps = {
  children: ReactNode
  index: number
  scrollTop: MotionValue<number>
  viewportHeight: MotionValue<number>
}

export function TrainingCycleWheelItem({ children, index, scrollTop, viewportHeight }: TrainingCycleWheelItemProps) {
  const reduceMotion = useReducedMotion()
  // The first row is centered by the scroll container's leading spacer.
  const distance = useTransform(() => Math.min(1, Math.abs(
    (index * cycleWheelRowHeight - scrollTop.get()) / Math.max(1, viewportHeight.get() / 2),
  )))
  const x = useTransform(() => {
    if (reduceMotion) return 8
    const { halfHeight, radius } = getCycleWheelGeometry(viewportHeight.get())
    const y = distance.get() * halfHeight
    return 8 - (radius - Math.sqrt(Math.max(0, radius ** 2 - y ** 2)))
  })
  const cardScale = useTransform(() => reduceMotion ? 1 : getCycleOrbitEmphasis(distance.get()).cardScale)
  const nodeScale = useTransform(() => reduceMotion ? 1 : getCycleOrbitEmphasis(distance.get()).nodeScale)
  const opacity = useTransform(() => getCycleOrbitEmphasis(distance.get()).opacity)

  return (
    <motion.div style={{ x, opacity, '--cycle-node-scale': nodeScale, '--cycle-card-scale': cardScale } as MotionStyle}>
      {children}
    </motion.div>
  )
}
