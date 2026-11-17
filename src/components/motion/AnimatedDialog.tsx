import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { dialogSpringTransition, quickEaseTransition } from './motion-tokens'

type AnimatedDialogProps = {
  children: ReactNode
  onClose: () => void
  open: boolean
  position?: 'center' | 'upper'
}

export function AnimatedDialog({ children, onClose, open, position = 'center' }: AnimatedDialogProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const viewportRef = useRef<HTMLDivElement>(null)
  const isUpper = position === 'upper'

  useEffect(() => {
    if (!open || !isUpper) return

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const viewport = window.visualViewport
    function updateViewport() {
      if (!viewportRef.current || !viewport) return
      viewportRef.current.style.top = `${viewport.offsetTop}px`
      viewportRef.current.style.height = `${viewport.height}px`
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    updateViewport()
    viewport?.addEventListener('resize', updateViewport)
    viewport?.addEventListener('scroll', updateViewport)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = overflow
      viewport?.removeEventListener('resize', updateViewport)
      viewport?.removeEventListener('scroll', updateViewport)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isUpper, onClose, open])

  return createPortal(
    <AnimatePresence initial={false}>
      {open ? (
        <div
          ref={viewportRef}
          className={`fixed inset-0 z-50 flex justify-center px-6 ${isUpper ? 'items-start pb-4 pt-[min(8dvh,3rem)]' : 'items-center'}`}
        >
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
            className={`relative z-10 w-full ${isUpper ? 'max-h-full max-w-[30rem] overflow-y-auto overscroll-contain rounded-[28px]' : ''}`}
          >
            {children}
          </motion.section>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
