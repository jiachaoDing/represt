import { motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '../ui/PageHeader'
import { quickEaseTransition } from '../motion/motion-tokens'

type ExercisePageLoadingProps = {
  showHeader?: boolean
}

const skeletonItems = [
  'h-4 w-20',
  'h-20 w-36',
  'h-3 w-44',
]

export function ExercisePageLoading({ showHeader = true }: ExercisePageLoadingProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative flex min-h-full flex-col pb-4">
      {showHeader ? (
        <PageHeader title={t('exercise.pageTitle')} subtitle={t('exercise.loadingSubtitle')} backFallbackTo="/" />
      ) : null}

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0, transition: quickEaseTransition }}
        className="mx-4 mt-2 overflow-hidden rounded-[1.5rem] border border-[var(--outline-variant)]/30 bg-[var(--surface)] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]"
      >
        <section className="bg-[var(--surface-container)]/30 px-4 pb-12 pt-14 text-center">
          <div className="flex flex-col items-center gap-5">
            {skeletonItems.map((className, index) => (
              <motion.div
                key={className}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: [0.45, 0.72, 0.45],
                        transition: {
                          duration: 1.2,
                          repeat: Infinity,
                          delay: index * 0.12,
                          ease: 'easeInOut',
                        },
                      }
                }
                className={`${className} rounded-full bg-[var(--surface-container-high)]`}
              />
            ))}
          </div>
        </section>

        <div className="h-[1px] w-full bg-[var(--outline-variant)]/20" />

        <section className="space-y-3 px-5 py-5">
          <div className="h-3 w-20 rounded-full bg-[var(--surface-container-high)] opacity-60" />
          <div className="h-4 w-48 rounded-full bg-[var(--surface-container-high)] opacity-70" />
        </section>
      </motion.div>
    </div>
  )
}
