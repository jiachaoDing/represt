import i18n from '../i18n'

type SeedPlanExerciseInput = {
  exerciseId: string
  targetSets: number
  restSeconds: number
  weightKg?: number | null
  reps?: number | null
  durationSeconds?: number | null
  distanceMeters?: number | null
}

const demoPlanBlueprints: Array<{
  nameKey: string
  exercises: SeedPlanExerciseInput[]
}> = [
  {
    nameKey: 'push',
    exercises: [
      { exerciseId: 'barbellBenchPress', targetSets: 4, restSeconds: 150 },
      { exerciseId: 'dumbbellShoulderPress', targetSets: 3, restSeconds: 120 },
      { exerciseId: 'dip', targetSets: 3, restSeconds: 120 },
      { exerciseId: 'tricepsPushdown', targetSets: 3, restSeconds: 90 },
    ],
  },
  {
    nameKey: 'pull',
    exercises: [
      { exerciseId: 'pullUp', targetSets: 4, restSeconds: 150 },
      { exerciseId: 'seatedRow', targetSets: 4, restSeconds: 120 },
      { exerciseId: 'latPulldown', targetSets: 3, restSeconds: 120 },
      { exerciseId: 'facePull', targetSets: 3, restSeconds: 90 },
    ],
  },
  {
    nameKey: 'legs',
    exercises: [
      { exerciseId: 'barbellSquat', targetSets: 4, restSeconds: 150 },
      { exerciseId: 'romanianDeadlift', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'legExtension', targetSets: 3, restSeconds: 90 },
      { exerciseId: 'legCurl', targetSets: 3, restSeconds: 90 },
    ],
  },
  {
    nameKey: 'upper',
    exercises: [
      { exerciseId: 'barbellBenchPress', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'barbellRow', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'barbellOverheadPress', targetSets: 3, restSeconds: 120 },
      { exerciseId: 'latPulldown', targetSets: 3, restSeconds: 120 },
    ],
  },
  {
    nameKey: 'lower',
    exercises: [
      { exerciseId: 'barbellSquat', targetSets: 4, restSeconds: 150 },
      { exerciseId: 'deadlift', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'lunge', targetSets: 3, restSeconds: 90 },
      { exerciseId: 'standingCalfRaise', targetSets: 3, restSeconds: 90 },
    ],
  },
  {
    nameKey: 'fullBody',
    exercises: [
      { exerciseId: 'barbellSquat', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'barbellBenchPress', targetSets: 3, restSeconds: 150 },
      { exerciseId: 'seatedRow', targetSets: 3, restSeconds: 120 },
      { exerciseId: 'plank', targetSets: 3, restSeconds: 60 },
    ],
  },
]

export function getLocalizedSeedPlans() {
  return demoPlanBlueprints.map((plan) => ({
    name: i18n.t(`plans.seed.${plan.nameKey}`),
    exercises: plan.exercises.map((exercise) => ({
      ...exercise,
      name: i18n.t(`names.${exercise.exerciseId}`, { ns: 'exercises' }),
    })),
  }))
}
