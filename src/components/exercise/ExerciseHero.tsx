import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { quickEaseTransition } from '../motion/motion-tokens'
import { getExerciseHeroData, getExerciseHeroTone } from '../../lib/exercise-hero'
import type { SessionExerciseDetail } from '../../db/sessions'

type ExerciseHeroProps = {
  detail: SessionExerciseDetail
  now: number
}

export function ExerciseHero({ detail, now }: ExerciseHeroProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const hero = getExerciseHeroData(detail, now, t)

  if (!hero) {
    return null
  }

  const heroTransitionKey = [
    hero.state,
    detail.exercise.completedSets,
    detail.exercise.restEndsAt ?? 'none',
  ].join(':')

  return (
    <section className="px-4 pb-12 pt-14 text-center bg-[var(--surface-container)]/30">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={heroTransitionKey}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1, transition: quickEaseTransition }}
          exit={
            reduceMotion
              ? { opacity: 0, transition: quickEaseTransition }
              : { opacity: 0, y: -12, scale: 0.98, transition: quickEaseTransition }
          }
        >
          <p className="mb-6 text-[15px] font-medium text-[var(--on-surface-variant)]">
            {hero.label}
          </p>
          <h2
            className={`text-[5rem] leading-none font-medium tracking-tight ${getExerciseHeroTone(hero.state)}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {hero.value}
          </h2>

          <div
            className={[
              'mx-auto mt-8 h-2 w-[180px] overflow-hidden rounded-full bg-[var(--primary-container)]',
              hero.state === 'resting' ? 'opacity-100' : 'opacity-0',
            ].join(' ')}
            aria-hidden={hero.state !== 'resting'}
          >
            <div
              className="h-full origin-left rounded-full bg-[var(--primary)] will-change-transform"
              style={{ transform: `scaleX(${hero.restRemainingRatio ?? 0})` }}
            />
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
