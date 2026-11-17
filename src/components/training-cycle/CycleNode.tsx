import { motion, useReducedMotion } from 'framer-motion'
import type { PlanColor } from '../../lib/plan-color'
import { restDayColor } from '../../lib/plan-color'
import { listSpringTransition } from '../motion/motion-tokens'

type CycleNodeProps = {
  color: PlanColor | null
  focused: boolean
  day?: number
}

export function CycleNode({ color, focused, day }: CycleNodeProps) {
  const reduceMotion = useReducedMotion()
  const palette = color ?? restDayColor
  return (
    <motion.span
      aria-hidden="true"
      initial={false}
      animate={{ scale: focused ? 1.2 : 1 }}
      transition={reduceMotion ? { duration: 0 } : listSpringTransition}
      className={`flex shrink-0 items-center justify-center rounded-full border text-xs font-bold ${day === undefined ? 'h-6 w-6' : 'h-8 w-8'}`}
      style={{
        backgroundColor: focused ? 'var(--cycle-focus)' : palette.soft,
        color: focused ? 'var(--on-cycle-focus)' : palette.text,
        borderColor: focused ? 'var(--cycle-focus)' : palette.solid,
        boxShadow: focused ? '0 0 0 4px color-mix(in srgb, var(--cycle-focus) 12%, transparent)' : undefined,
      }}
    >
      {day}
    </motion.span>
  )
}
