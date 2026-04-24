import type { PropsWithChildren } from 'react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'

import { listSpringTransition, quickEaseTransition } from './motion-tokens'

type AnimatedListProps = PropsWithChildren<{
  className?: string
}>

type AnimatedListItemProps = PropsWithChildren<{
  className?: string
}>

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <LayoutGroup>
      <div className={className}>
        <AnimatePresence initial={false} mode="popLayout">
          {children}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  )
}

export function AnimatedListItem({ children, className }: AnimatedListItemProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      layout
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, height: 0, scale: 0.985 }}
      animate={{
        opacity: 1,
        height: 'auto',
        scale: 1,
        transition: reduceMotion ? quickEaseTransition : listSpringTransition,
      }}
      exit={
        reduceMotion
          ? { opacity: 0, transition: quickEaseTransition }
          : {
              opacity: 0,
              height: 0,
              scale: 0.98,
              transition: quickEaseTransition,
            }
      }
      className={className}
      style={{ overflow: 'hidden', originY: 0.5 }}
    >
      {children}
    </motion.div>
  )
}
