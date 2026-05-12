import { useEffect, type PropsWithChildren, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { quickEaseTransition, sheetSpringTransition } from './motion-tokens'

export type AnimatedSheetProps = PropsWithChildren<{
  actions?: ReactNode
  description?: string
  onClose: () => void
  open: boolean
  title: string
  variant?: 'default' | 'prominent'
}>

export function AnimatedSheet({
  actions,
  children,
  description,
  onClose,
  open,
  title,
  variant = 'default',
}: AnimatedSheetProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const isProminent = variant === 'prominent'

  useEffect(() => {
    if (!open) {
      return
    }

    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence initial={false}>
      {open ? (
        <div className="fixed inset-0 z-50">
          <motion.button
            key="sheet-backdrop"
            type="button"
            aria-label={t('common.closeSheet')}
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: quickEaseTransition }}
            exit={{ opacity: 0, transition: quickEaseTransition }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 mx-auto w-full max-w-[30rem] px-0 pb-0">
            <motion.section
              key="sheet-panel"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }}
              animate={{
                opacity: 1,
                y: 0,
                transition: reduceMotion ? quickEaseTransition : sheetSpringTransition,
              }}
              exit={
                reduceMotion
                  ? { opacity: 0, transition: quickEaseTransition }
                  : {
                      opacity: 0,
                      y: 28,
                      transition: quickEaseTransition,
                    }
              }
              className={`max-h-[90vh] w-full overflow-auto rounded-t-[28px] bg-[var(--surface-container)] px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 shadow-2xl ${
                isProminent ? 'rounded-t-[2rem] pb-[max(2rem,env(safe-area-inset-bottom))]' : ''
              }`}
            >
              <div className={`mx-auto h-1 rounded-full bg-[var(--outline)] ${isProminent ? 'mb-8 w-14' : 'mb-6 w-8'}`} />
              <div className="flex items-start justify-between gap-3 px-2">
                <div className="min-w-0">
                  <h2 className={`${isProminent ? 'text-3xl font-semibold' : 'text-xl font-normal'} text-[var(--on-surface)]`}>
                    {title}
                  </h2>
                  {description ? (
                    <p className={`${isProminent ? 'mt-2 text-base font-semibold' : 'mt-1 text-sm'} text-[var(--on-surface-variant)]`}>
                      {description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label={t('common.close')}
                  className={`inline-flex items-center justify-center rounded-full text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface)]/10 ${
                    isProminent ? 'h-12 w-12 bg-[var(--surface-container-high)]' : 'h-10 w-10'
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="24"
                    height="24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="mt-4 px-2">{children}</div>
              {actions ? <div className="mt-5 px-2">{actions}</div> : null}
            </motion.section>
          </div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  )
}
