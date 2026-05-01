import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { quickEaseTransition } from '../motion/motion-tokens'
import { getExerciseHeroData, getExerciseHeroTone } from '../../lib/exercise-hero'
import type { ScheduleExerciseDetail } from '../../db/sessions'

type ExerciseHeroProps = {
  detail: ScheduleExerciseDetail
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
    <section className="flex h-[19rem] shrink-0 items-center justify-center px-4 py-4 text-center">
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
          <p className={`mb-5 text-[16px] font-medium ${getExerciseHeroTone(hero.state)}`}>
            {hero.label}
          </p>
          <h2
            className={`text-[4.75rem] leading-none font-medium tracking-normal ${getExerciseHeroTone(hero.state)}`}
            style={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {hero.value}
          </h2>

          <div
            className={[
              'mx-auto mt-6 h-1 w-20 overflow-hidden rounded-full',
              hero.state === 'resting' ? 'bg-[var(--tertiary)]' : 'bg-[var(--primary)]',
            ].join(' ')}
            aria-hidden="true"
          >
            {hero.state === 'resting' ? (
              <div
                className="h-full origin-left rounded-full bg-[var(--primary)] will-change-transform"
                style={{ transform: `scaleX(${1 - (hero.restRemainingRatio ?? 0)})` }}
              />
            ) : null}
          </div>

          {hero.supporting ? (
            <p className="mt-4 text-[16px] text-[var(--on-surface-variant)]">{hero.supporting}</p>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
