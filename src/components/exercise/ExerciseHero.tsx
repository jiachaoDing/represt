import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

import { quickEaseTransition } from '../motion/motion-tokens'
import { getExerciseHeroData, getExerciseHeroTone } from '../../lib/exercise-hero'
import { getMeasurementTypeForExercise } from '../../lib/set-record-measurement'
import { formatWeightKg } from '../../lib/weight-units'
import type { ScheduleExerciseDetail } from '../../db/sessions'

type ExerciseHeroProps = {
  detail: ScheduleExerciseDetail
  now: number
}

export function ExerciseHero({ detail, now }: ExerciseHeroProps) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const hero = getExerciseHeroData(detail, now, t)
  const measurementType = getMeasurementTypeForExercise(detail.exercise)
  const { defaultWeightKg, defaultReps } = detail.exercise
  const { weightKg: prWeightKg, reps: prReps } = detail.personalRecords
  const showWeight =
    (measurementType === 'weightReps' || measurementType === 'weightDistance') && defaultWeightKg != null
  const showReps =
    (measurementType === 'weightReps' || measurementType === 'reps') && defaultReps != null
  const showPrWeight =
    (measurementType === 'weightReps' || measurementType === 'weightDistance') && prWeightKg != null
  const showPrReps =
    (measurementType === 'weightReps' || measurementType === 'reps') && prReps != null
  const showPrSeparator = (showWeight || showReps) && (showPrWeight || showPrReps)

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
          className="w-full"
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

          {showWeight || showReps || showPrWeight || showPrReps ? (
            <dl className="mx-auto mt-5 grid min-h-15 max-w-sm grid-flow-col auto-cols-fr items-end gap-x-3">
              {showWeight ? (
                <div className="min-w-0">
                  <dt className="flex items-end justify-center text-[12px] text-[var(--on-surface-variant)]">{t('plans.defaultWeight')}</dt>
                  <dd className="mt-1 text-[16px] font-medium tabular-nums text-[var(--on-surface)]">
                    {formatWeightKg(defaultWeightKg, t)}
                  </dd>
                </div>
              ) : null}
              {showReps ? (
                <div className="min-w-0">
                  <dt className="flex items-end justify-center text-[12px] text-[var(--on-surface-variant)]">{t('plans.defaultReps')}</dt>
                  <dd className="mt-1 text-[16px] font-medium tabular-nums text-[var(--on-surface)]">
                    {t('common.reps', { value: defaultReps })}
                  </dd>
                </div>
              ) : null}
              {showPrWeight ? (
                <div className="relative min-w-0">
                  <dt className="flex items-end justify-center text-[12px] text-[var(--on-surface-variant)]">
                    {showPrSeparator ? (
                      <span aria-hidden="true" className="absolute top-[3px] bottom-1 -left-1.5 w-px -translate-x-1/2 -skew-x-12 bg-[var(--outline-variant)]" />
                    ) : null}
                    {t('exercise.prWeight')}
                  </dt>
                  <dd className="mt-1 text-[16px] font-medium tabular-nums text-[var(--on-surface)]">
                    {formatWeightKg(prWeightKg, t)}
                  </dd>
                </div>
              ) : null}
              {showPrReps ? (
                <div className="relative min-w-0">
                  <dt className="flex items-end justify-center text-[12px] text-[var(--on-surface-variant)]">
                    {showPrSeparator && !showPrWeight ? (
                      <span aria-hidden="true" className="absolute top-[3px] bottom-1 -left-1.5 w-px -translate-x-1/2 -skew-x-12 bg-[var(--outline-variant)]" />
                    ) : null}
                    {t('exercise.prReps')}
                  </dt>
                  <dd className="mt-1 text-[16px] font-medium tabular-nums text-[var(--on-surface)]">
                    {t('common.reps', { value: prReps })}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </section>
  )
}
