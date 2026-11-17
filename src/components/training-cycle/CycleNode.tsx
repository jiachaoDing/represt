import { motion, useReducedMotion } from 'framer-motion'
import type { PlanColor } from '../../lib/plan-color'
import { restDayColor } from '../../lib/plan-color'
import { cycleOrbitReducedTransition, cycleOrbitTokens, cycleOrbitTransition } from './cycle-orbit-tokens'
import { CycleTodayMarker } from './CycleTodayMarker'

type CycleNodeProps = {
  color: PlanColor | null
  focused: boolean
  day?: number
  today?: boolean
}

export function CycleNode({ color, focused, day, today = false }: CycleNodeProps) {
  const reduceMotion = useReducedMotion()
  const palette = color ?? restDayColor
  const size = day === undefined ? cycleOrbitTokens.node.size : cycleOrbitTokens.node.numberedSize
  return (
    <motion.span
      aria-hidden="true"
      initial={false}
      animate={{ scale: focused ? cycleOrbitTokens.node.focusedScale : 1 }}
      transition={reduceMotion ? cycleOrbitReducedTransition : cycleOrbitTransition}
      className="relative flex shrink-0 items-center justify-center rounded-full border text-xs font-bold"
      style={{
        width: size,
        height: size,
        borderWidth: cycleOrbitTokens.node.borderWidth,
        backgroundColor: day === undefined ? palette.solid : palette.soft,
        color: palette.text,
        borderColor: palette.solid,
        boxShadow: focused ? cycleOrbitTokens.focus.shadow : undefined,
      }}
    >
      {day}
      {today ? <CycleTodayMarker className="absolute -bottom-3 left-1/2 -translate-x-1/2" /> : null}
    </motion.span>
  )
}
