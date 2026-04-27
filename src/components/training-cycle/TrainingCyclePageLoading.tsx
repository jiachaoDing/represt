import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '../ui/PageHeader'
import { quickEaseTransition } from '../motion/motion-tokens'

type TrainingCyclePageLoadingProps = {
  showHeader?: boolean
}

function TrainingCycleLoadingBody() {
  const reduceMotion = useReducedMotion()

  return (
    <motion.section
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0, transition: quickEaseTransition }}
      className="relative mx-auto mt-4 max-w-lg pb-28"
    >
      <div className="absolute bottom-6 left-[2.125rem] top-8 w-px bg-[var(--outline-variant)]/30" />

      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="relative flex gap-4 px-4 py-3">
          <div className="relative z-10 flex w-10 shrink-0 flex-col items-center pt-[1.125rem]">
            <motion.div
              animate={
                reduceMotion
                  ? undefined
                  : {
                      opacity: [0.45, 0.72, 0.45],
                      transition: {
                        duration: 1.2,
                        repeat: Infinity,
                        delay: item * 0.1,
                        ease: 'easeInOut',
                      },
                    }
              }
              className="h-[1.375rem] w-[1.375rem] rounded-full bg-[var(--surface-container-high)]"
            />
          </div>

          <motion.div
            animate={
              reduceMotion
                ? undefined
                : {
                    opacity: [0.5, 0.78, 0.5],
                    transition: {
                      duration: 1.2,
                      repeat: Infinity,
                      delay: item * 0.1,
                      ease: 'easeInOut',
                    },
                  }
            }
            className="flex flex-1 items-center justify-between rounded-3xl border border-[var(--outline-variant)]/20 bg-[var(--surface-container)] p-5"
          >
            <div className="space-y-3">
              <div className="h-4 w-24 rounded-full bg-[var(--surface-container-high)]" />
              <div className="h-3 w-32 rounded-full bg-[var(--surface-container-high)]" />
              <div className="h-3 w-14 rounded-full bg-[var(--surface-container-high)]" />
            </div>
            <div className="h-8 w-8 rounded-full bg-[var(--surface-container-high)]" />
          </motion.div>
        </div>
      ))}
    </motion.section>
  )
}

export function TrainingCyclePageLoading({ showHeader = true }: TrainingCyclePageLoadingProps) {
  const { t } = useTranslation()

  if (!showHeader) {
    return <TrainingCycleLoadingBody />
  }

  return (
    <div className="flex h-[calc(100vh-5rem-env(safe-area-inset-bottom))] min-h-0 flex-col bg-[var(--surface)]">
      <PageHeader
        title={t('trainingCycle.title')}
        subtitle={t('trainingCycle.loadingSubtitle')}
        backFallbackTo="/templates"
      />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <TrainingCycleLoadingBody />
      </div>
    </div>
  )
}
