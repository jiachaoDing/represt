import { describe, expect, it } from 'vitest'
import {
  calculateProgressionTargets as calculate,
  getEquipmentIncrementKg,
  getProgressionRepRange,
  type ProgressionConfig,
  type ProgressionHistory,
} from '../src/lib/progressive-overload'

const config: ProgressionConfig = {
  targetSets: 3, defaultWeightKg: 60, defaultReps: 10,
  repMin: 8, repMax: 12, incrementKg: 2.5, repsOnly: false,
}
const workout = (reps: Array<number | null>, weightKg = 60): ProgressionHistory => ({
  targetSets: 3, completed: reps.length === 3,
  sets: reps.map((value, index) => ({ setNumber: index + 1, weightKg, reps: value })),
})
const expected = (reps: number[], weightKg: number | null = 60) => reps.map((value) => ({ weightKg, reps: value }))

describe('whole-exercise double progression', () => {
  it('initializes from the plan without history or a PR', () => {
    expect(calculate(config)).toEqual(expected([10, 10, 10]))
    expect(calculate({ ...config, defaultWeightKg: null, defaultReps: null })).toEqual(expected([8, 8, 8], null))
  })
  it('advances the corresponding sets by one rep', () => {
    expect(calculate(config, [workout([10, 9, 8])])).toEqual(expected([11, 10, 9]))
  })
  it('increases the common load only when all sets reach the ceiling', () => {
    expect(calculate(config, [workout([12, 12, 12])])).toEqual(expected([8, 8, 8], 62.5))
    expect(calculate(config, [workout([14, 13, 12])])).toEqual(expected([8, 8, 8], 62.5))
  })
  it('holds sets already at the ceiling while other sets climb', () => {
    expect(calculate(config, [workout([12, 11, 10])])).toEqual(expected([12, 12, 11]))
  })
  it('holds weight after one poor workout, including a zero-rep failure', () => {
    expect(calculate(config, [workout([7, 6, 0])])).toEqual(expected([8, 8, 8]))
  })
  it('deloads about 5% after two complete same-load workouts miss the floor on a majority of sets', () => {
    expect(calculate(config, [workout([7, 6, 8]), workout([6, 7, 10])])).toEqual(expected([8, 8, 8], 57.5))
    expect(calculate(config, [workout([7, 8, 8]), workout([6, 7, 8])])).toEqual(expected([8, 9, 9]))
  })
  it('does not deload across a load change or interrupted workout', () => {
    expect(calculate(config, [workout([6, 6, 6], 65), workout([6, 6, 6])])).toEqual(expected([8, 8, 8], 65))
    expect(calculate(config, [workout([6, 6, 6]), workout([6, 6])])).toEqual(expected([8, 8, 8]))
  })
  it('holds saved targets when a set was skipped', () => {
    const entry = workout([12, 12, 12])
    entry.sets[1].status = 'skipped'
    entry.targets = expected([11, 10, 9])
    expect(calculate(config, [entry])).toEqual(expected([11, 10, 9]))
  })
  it('does not advance after interrupted, missing or unlogged work', () => {
    expect(calculate(config, [workout([12, 12])])).toEqual(expected([10, 10, 10]))
    expect(calculate(config, [workout([12, 12, null])])).toEqual(expected([10, 10, 10]))
    const entry = workout([12, 12, 12])
    entry.completed = false
    expect(calculate(config, [entry])).toEqual(expected([10, 10, 10]))
  })
  it('bases the next workout on actual manually adjusted load', () => {
    expect(calculate(config, [workout([10, 9, 8], 65)])).toEqual(expected([11, 10, 9], 65))
    expect(calculate(config, [workout([12, 12, 12], 50)])).toEqual(expected([8, 8, 8], 52.5))
  })
  it('cannot earn a load increase from mixed working weights', () => {
    const entry = workout([12, 12, 12])
    entry.sets[2].weightKg = 50
    expect(calculate(config, [entry]).every((target) => target.weightKg === 50)).toBe(true)
  })
  it('progresses bodyweight reps and holds the ceiling without adding weight or sets', () => {
    const bodyweight = { ...config, repsOnly: true, defaultWeightKg: null }
    expect(calculate(bodyweight, [workout([10, 9, 8], 0)])).toEqual(expected([11, 10, 9], null))
    expect(calculate(bodyweight, [workout([12, 12, 12], 0)])).toEqual(expected([12, 12, 12], null))
    expect(calculate(config, [workout([12, 12, 12], 0)])).toEqual(expected([12, 12, 12], 0))
  })
  it('excludes warmups and detects duplicate ordinals and set-count changes', () => {
    const entry = workout([12, 12, 12])
    entry.sets.push({ setNumber: 0, reps: 5, weightKg: 20, kind: 'warmup' })
    expect(calculate(config, [entry])).toEqual(expected([8, 8, 8], 62.5))
    entry.sets[0].setNumber = 2
    expect(calculate(config, [entry])).toEqual(expected([10, 10, 10]))
    expect(calculate({ ...config, targetSets: 4 }, [workout([12, 12, 12])])).toEqual(expected([10, 10, 10, 10]))
  })
  it('uses equipment steps and plan-specific rep ranges', () => {
    for (const id of ['barbellBenchPress', 'barbellSquat', 'deadlift', 'romanianDeadlift',
      'sumoDeadlift', 'frontSquat', 'boxSquat', 'lunge', 'shrug', 'preacherCurl',
      'closeGripBenchPress', 'skullCrusher', 'smithMachineSquat', 'ezBarCurl']) {
      expect(getEquipmentIncrementKg(id)).toBe(5)
    }
    for (const id of ['dumbbellBenchPress', 'arnoldPress', 'hammerCurl', 'concentrationCurl', 'gobletSquat']) {
      expect(getEquipmentIncrementKg(id)).toBe(2.5)
    }
    expect(calculate({ ...config, incrementKg: getEquipmentIncrementKg('barbellBenchPress') },
      [workout([12, 12, 12])])).toEqual(expected([8, 8, 8], 65))
    expect(calculate({ ...config, incrementKg: getEquipmentIncrementKg('dumbbellBenchPress') },
      [workout([12, 12, 12], 20)])).toEqual(expected([8, 8, 8], 22.5))
    expect(getProgressionRepRange(5)).toEqual({ repMin: 3, repMax: 7 })
    expect(getProgressionRepRange(15)).toEqual({ repMin: 13, repMax: 17 })
    expect(getProgressionRepRange(null)).toEqual({ repMin: 8, repMax: 12 })
  })
  it('does not mutate its inputs', () => {
    const history = [workout([12, 12, 12])]
    const original = structuredClone(history)
    calculate(config, history)
    expect(history).toEqual(original)
  })
  it('never raises a very light load when a feasible deload is unavailable', () => {
    expect(calculate(config, [workout([6, 6, 6], 1), workout([6, 6, 6], 1)])).toEqual(expected([8, 8, 8], 1))
  })
})
