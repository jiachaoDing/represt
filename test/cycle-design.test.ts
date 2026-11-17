import { afterEach, expect, it } from 'vitest'
import { getTemplateColor, getPlanColor, restDayColor } from '../src/lib/plan-color'
import { getCycleReturnSlotId, getViewedCycleSlotId, setViewedCycleSlotId } from '../src/lib/cycle-view-selection'
import { getCycleOrbitEmphasis } from '../src/components/training-cycle/training-cycle-wheel-geometry'

afterEach(() => setViewedCycleSlotId(null))

it('shares category colors across templates and languages', () => {
  for (const name of ['上肢 A', '上肢 C', 'Upper B']) {
    expect(getTemplateColor({ id: name, name })).toEqual(getPlanColor(1))
  }
  expect(getTemplateColor({ id: 'lower', name: '下肢 B' })).toEqual(getPlanColor(0))
  expect(getTemplateColor({ id: 'cardio', name: 'Zone 2 + 活动度' })).toEqual(getPlanColor(2))
  expect(getTemplateColor({ id: 'rest', name: 'Rest day' })).toEqual(restDayColor)
})

it('keeps custom template color stable when template order changes', () => {
  const plans = [{ id: 'a', name: 'Custom A' }, { id: 'b', name: 'Custom B' }]
  const colors = new Map(plans.map((plan) => [plan.id, getTemplateColor(plan)]))
  for (const plan of [...plans].reverse()) expect(getTemplateColor(plan)).toEqual(colors.get(plan.id))
})

it('retains slot identity for return navigation including repeated templates and rest', () => {
  const slots = [{ id: 'first', planId: 'upper' }, { id: 'rest', planId: null }, { id: 'repeat', planId: 'upper' }]
  for (const slot of slots) {
    setViewedCycleSlotId(slot.id, true)
    expect(getViewedCycleSlotId()).toBe(slot.id)
    expect(getCycleReturnSlotId()).toBe(slot.id)
    expect([...slots].reverse().find((item) => item.id === getViewedCycleSlotId())).toEqual(slot)
  }
  setViewedCycleSlotId(null)
  expect(getCycleReturnSlotId()).toBeNull()
})

it('uses the same symmetric, bounded focus falloff on both orbit axes', () => {
  expect(getCycleOrbitEmphasis(0)).toEqual({ nodeScale: 1, cardScale: 1, opacity: 1 })
  expect(getCycleOrbitEmphasis(-0.5)).toEqual(getCycleOrbitEmphasis(0.5))
  expect(getCycleOrbitEmphasis(0.5).opacity).toBeGreaterThan(getCycleOrbitEmphasis(1).opacity)
  expect(getCycleOrbitEmphasis(5)).toEqual(getCycleOrbitEmphasis(1))
})
