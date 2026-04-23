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
    <section className="px-4 pb-10 pt-16 text-center">
      <p className="mb-4 text-xs font-medium uppercase tracking-[0.16em] text-[var(--on-surface-variant)]">
        {hero.label}
      </p>
      {typeof hero.value === 'string' ? (
        <h2
          className={`text-6xl font-medium tracking-tighter ${getExerciseHeroTone(hero.state)}`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {hero.value}
        </h2>
      ) : (
        <div
          className={`flex items-baseline justify-center tracking-tighter ${getExerciseHeroTone(hero.state)}`}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          <h2 className="text-6xl font-medium">{hero.value.main}</h2>
          <span className="text-4xl font-medium opacity-80">{hero.value.fraction}</span>
        </div>
      )}
      <p className="mx-auto mt-6 max-w-[240px] text-sm text-[var(--on-surface-variant)]">
        {hero.supporting}
      </p>
    </section>
  )
}
