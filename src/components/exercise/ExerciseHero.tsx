import { useTranslation } from 'react-i18next'

import { getExerciseHeroData, getExerciseHeroTone } from '../../lib/exercise-hero'
import type { SessionExerciseDetail } from '../../db/sessions'

type ExerciseHeroProps = {
  detail: SessionExerciseDetail
  now: number
}

export function ExerciseHero({ detail, now }: ExerciseHeroProps) {
  const { t } = useTranslation()
  const hero = getExerciseHeroData(detail, now, t)

  if (!hero) {
    return null
  }

  return (
    <section className="px-4 pb-12 pt-14 text-center bg-[var(--surface-container)]/30">
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
    </section>
  )
}
