import { describe, expect, it } from 'vitest'
import { mergeProgram } from '../src/program.js'
import { updateInput, type Program, type ProgramUpdate } from '../src/schemas.js'

function program(): Program {
  const now = '2026-10-01T00:00:00.000Z'
  return { plans: ['a', 'b'].map((id) => ({ id, name: id, createdAt: now, updatedAt: now, exercises: [{
    id: `${id}-exercise`, planId: id, name: 'Exercise', catalogExerciseId: null, measurementType: 'weightReps',
    targetSets: 3, restSeconds: 90, weightKg: 60, reps: 8, durationSeconds: null, distanceMeters: null, order: 0,
  }] })), cycle: { id: 'default', slots: [{ id: 'train', planId: 'a' }, { id: 'rest', planId: null }],
    anchorDateKey: '2026-10-01', anchorIndex: 0, updatedAt: now } }
}
const request = (changes: Partial<ProgramUpdate>): ProgramUpdate => ({
  expectedVersion: 1, confirmedByUser: true, userInstruction: 'Apply these requested changes.', ...changes,
})

describe('program changes', () => {
  it('preserves all unaffected objects and IDs without mutating its input', () => {
    const before = program()
    const next = mergeProgram(before, request({ plans: [{ id: 'a', exercises: [{ id: 'a-exercise', weightKg: 65 }] }] }))
    expect(next.plans[0].exercises[0]).toMatchObject({ id: 'a-exercise', planId: 'a', weightKg: 65, reps: 8 })
    expect(next.plans[1]).toEqual(before.plans[1])
    expect(next.cycle).toEqual(before.cycle)
    expect(before.plans[0].exercises[0].weightKg).toBe(60)
  })
  it('creates IDs only for newly requested plans, exercises and slots', () => {
    const before = program()
    const next = mergeProgram(before, request({
      plans: [{ name: 'New', exercises: [{ name: 'Squat', targetSets: 3, restSeconds: 120 }] }],
      cycle: { slots: [{ planId: null }, { planId: 'a' }, { planId: 'a' }], anchorDateKey: '2026-10-01', anchorIndex: 0 },
    }))
    const added = next.plans.find((p) => p.name === 'New')!
    expect(added.id).toMatch(/^[\da-f-]{36}$/)
    expect(added.exercises[0].planId).toBe(added.id)
    expect(next.cycle!.slots[0].id).toBe('rest')
    expect(next.cycle!.slots[1].id).toBe('train')
    expect(next.cycle!.slots[2].id).not.toBe('train')
  })
  it('does not silently delete references or replace unknown IDs', () => {
    expect(() => mergeProgram(program(), request({ removePlanIds: ['a'] }))).toThrow(/cycle/i)
    expect(() => mergeProgram(program(), request({ plans: [{ id: 'missing', name: 'New' }] }))).toThrow(/does not exist/)
    expect(() => mergeProgram(program(), request({ plans: [{ id: 'a', exercises: [{ id: 'b-exercise', reps: 10 }] }] }))).toThrow(/does not belong/)
  })
  it('only deletes objects explicitly requested and keeps the rest intact', () => {
    const before = program()
    const next = mergeProgram(before, request({ removePlanIds: ['b'], plans: [{ id: 'a', removeExerciseIds: ['a-exercise'] }] }))
    expect(next.plans).toHaveLength(1)
    expect(next.plans[0].exercises).toEqual([])
    expect(next.cycle).toEqual(before.cycle)
  })
  it('rejects contradictory updates and duplicate identities', () => {
    expect(() => mergeProgram(program(), request({ plans: [{ id: 'b' }], removePlanIds: ['b'] }))).toThrow(/update and remove/)
    expect(() => mergeProgram(program(), request({ plans: [{ id: 'a' }, { id: 'a' }] }))).toThrow(/Duplicate/)
    expect(() => mergeProgram(program(), request({ cycle: { slots: [{ id: 'train', planId: 'a' }, { id: 'train', planId: null }], anchorDateKey: '2026-10-01', anchorIndex: 0 } }))).toThrow(/Duplicate/)
  })
  it('retains timestamps when no state changes', () => {
    expect(mergeProgram(program(), request({ plans: [{ id: 'a', name: 'a' }] }))).toEqual(program())
  })
  it('preserves existing names verbatim, including whitespace, on unrelated edits', () => {
    const before = program()
    before.plans[1].name = '  User plan  '
    const next = mergeProgram(before, request({ plans: [{ id: 'a', name: 'Renamed' }] }))
    expect(next.plans[1]).toEqual(before.plans[1])
  })
  it('requires explicit user authorization, rejects unexpected identity fields and impossible dates', () => {
    expect(updateInput.safeParse({ expectedVersion: 1, confirmedByUser: false }).success).toBe(false)
    expect(updateInput.safeParse({ ...request({}), userId: 'another-user' }).success).toBe(false)
    expect(updateInput.safeParse(request({ cycle: { slots: [], anchorDateKey: '2026-02-30', anchorIndex: 0 } })).success).toBe(false)
  })
})
