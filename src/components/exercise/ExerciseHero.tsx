import { getExerciseHeroData, getExerciseHeroTone } from '../../lib/exercise-hero'
import type { SessionExerciseDetail } from '../../db/sessions'

type ExerciseHeroProps = {
  detail: SessionExerciseDetail
  now: number
}

export function ExerciseHero({ detail, now }: ExerciseHeroProps) {
  const hero = getExerciseHeroData(detail, now)

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
      
      {/* Fake progress bar placeholder that looks like the design */}
      {hero.state === 'resting' && (
        <div className="mx-auto mt-8 h-2 w-[180px] overflow-hidden rounded-full bg-[var(--primary-container)]">
          <div className="h-full w-1/3 rounded-full bg-[var(--primary)] transition-all duration-1000" />
        </div>
      )}
    </section>
  )
}
