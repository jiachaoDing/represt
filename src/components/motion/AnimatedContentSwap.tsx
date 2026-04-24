import type { PropsWithChildren } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

import { quickEaseTransition } from './motion-tokens'

type AnimatedContentSwapProps = PropsWithChildren<{
  contentKey: string | number
  className?: string
}> 

export function AnimatedContentSwap({
  children,
  className,
  contentKey,
}: AnimatedContentSwapProps) {
  const reduceMotion = useReducedMotion()

  return (
    <span className={className}>
      <AnimatePresence initial={false} mode="wait">
        <motion.span
          key={contentKey}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: 1,
            transition: quickEaseTransition,
          }}
          exit={
            reduceMotion
              ? { opacity: 0, transition: quickEaseTransition }
              : {
                  opacity: 0,
                  y: -8,
                  scale: 0.98,
                  transition: quickEaseTransition,
                }
          }
          className="inline-flex items-center justify-center"
        >
          {children}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
