import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { dialogSpringTransition, quickEaseTransition } from './motion-tokens'

type AnimatedDialogProps = {
  children: ReactNode
  onClose: () => void
  open: boolean
}

export function AnimatedDialog({ children, onClose, open }: AnimatedDialogProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()

  return createPortal(
    <AnimatePresence initial={false}>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
          <motion.button
            key="dialog-backdrop"
            type="button"
            aria-label={t('common.closeDialog')}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: quickEaseTransition }}
            exit={{ opacity: 0, transition: quickEaseTransition }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.section
            key="dialog-panel"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.94 }}
            animate={{
              opacity: 1,
              y: 0,
              scale: 1,
              transition: reduceMotion ? quickEaseTransition : dialogSpringTransition,
            }}
            exit={
              reduceMotion
                ? { opacity: 0, transition: quickEaseTransition }
                : {
                    opacity: 0,
                    y: 12,
                    scale: 0.96,
                    transition: quickEaseTransition,
                  }
            }
            className="relative z-10 w-full"
          >
            {children}
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
