import { afterEach, expect, it } from 'vitest'
import { getTemplateColor, getPlanColor, restDayColor } from '../src/lib/plan-color'
import { getCycleReturnSlotId, getViewedCycleSlotId, setViewedCycleSlotId } from '../src/lib/cycle-view-selection'
import { cycleWheelRowHeight, getCycleOrbitEmphasis, rebaseCycleWheelOffset } from '../src/components/training-cycle/training-cycle-wheel-geometry'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { getCycleNodeState } from '../src/lib/cycle-orbit'
import { CycleNode } from '../src/components/training-cycle/CycleNode'
import { cycleOrbitTokens } from '../src/components/training-cycle/cycle-orbit-tokens'
import { PlanTemplateChip } from '../src/components/plans/PlanTemplateChip'
import { TrainingCycleDots } from '../src/components/training-cycle/TrainingCycleDots'

afterEach(() => setViewedCycleSlotId(null))

it('preserves rendered wheel positions when sorting commits during an unfinished animation', () => {
  for (const previousIndex of [0, 2, 5]) {
    for (const index of [0, 1, 5]) {
      for (const offset of [-224, -57.5, 0, 31.25, 336]) {
        const rebased = rebaseCycleWheelOffset(offset, previousIndex, index)
        expect(index * cycleWheelRowHeight + rebased)
          .toBe(previousIndex * cycleWheelRowHeight + offset)
        expect(rebaseCycleWheelOffset(rebased, index, previousIndex)).toBe(offset)
      }
    }
  }
})

it('commits completed sorting previews without a second displacement', () => {
  const order = ['first', 'rest', 'repeat', 'last']
  const preview = ['rest', 'repeat', 'last', 'first']
  for (const [index, id] of preview.entries()) {
    const previousIndex = order.indexOf(id)
    const offset = (index - previousIndex) * cycleWheelRowHeight
    expect(rebaseCycleWheelOffset(offset, previousIndex, index)).toBe(0)
  }
})

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

it('derives independent focus and today by slot identity across repeated templates and reordering', () => {
  const slots = [{ id: 'first', planId: 'upper' }, { id: 'repeat', planId: 'upper' }, { id: 'rest', planId: null }]
  const original = structuredClone(slots)
  expect(getCycleNodeState(slots[0], 'repeat', 'first')).toEqual({ focused: false, today: true })
  expect(getCycleNodeState(slots[1], 'repeat', 'first')).toEqual({ focused: true, today: false })
  for (const slot of [...slots].reverse()) {
    expect(getCycleNodeState(slot, slot.id, slot.id)).toEqual({ focused: true, today: true })
    expect(getCycleNodeState(slot, null, 'removed')).toEqual({ focused: false, today: false })
  }
  expect(slots).toEqual(original)
})

it('retains template and rest colors while composing focus and today', () => {
  for (const color of [getPlanColor(1), null]) {
    const palette = color ?? restDayColor
    for (const focused of [false, true]) {
      for (const today of [false, true]) {
        const html = renderToStaticMarkup(createElement(CycleNode, { color, focused, today, day: 3 }))
        expect(html).toContain(`background-color:${palette.soft}`)
        expect(html).toContain(`border-color:${palette.solid}`)
        expect(html.includes(cycleOrbitTokens.focus.shadow)).toBe(focused)
        expect(html.includes(`background-color:${cycleOrbitTokens.today.color}`)).toBe(today)
      }
    }
  }
})

it('uses solid for unnumbered orbit nodes and soft for numbered nodes in every focus state', () => {
  for (const color of [...Array.from({ length: 5 }, (_, index) => getPlanColor(index)), null]) {
    const palette = color ?? restDayColor
    for (const focused of [false, true]) {
      for (const day of [undefined, 1]) {
        const html = renderToStaticMarkup(createElement(CycleNode, { color, focused, day }))
        expect(html).toContain(`background-color:${day === undefined ? palette.solid : palette.soft}`)
        if (day !== undefined) expect(html).toContain(`color:${palette.text}`)
        expect(html.includes(cycleOrbitTokens.focus.shadow)).toBe(focused)
      }
    }
  }
})

it('keeps text-bearing template chips soft with paired text in both selection states', () => {
  for (const color of [...Array.from({ length: 5 }, (_, index) => getPlanColor(index)), restDayColor]) {
    for (const selected of [false, true]) {
      const html = renderToStaticMarkup(createElement(PlanTemplateChip, { color, selected }, 'Template'))
      expect(html).toContain(`background-color:${color.soft}`)
      expect(html).toContain(`color:${color.text}`)
      expect(html).toContain(`aria-pressed="${selected}"`)
      if (selected) expect(html).toContain('border-color:var(--cycle-focus)')
    }
  }
})

it('keeps all top cycle dots solid across highlighted templates, rest and selection', () => {
  const slots = [{ id: 'a', planId: 'a' }, { id: 'b', planId: 'b' }, { id: 'rest', planId: null }]
  for (const highlightedPlanId of [null, 'a', 'b']) {
    const tree = TrainingCycleDots({ slots, currentIndex: 0, selectedIndex: 1,
      highlightedPlanId, getPlanColor: () => getPlanColor(1), onSelect: () => {} })
    for (const [index, container] of tree.props.children.entries()) {
      const dot = container.props.children[0]
      expect(dot.props.style.backgroundColor).toBe(index === 2 ? restDayColor.solid : getPlanColor(1).solid)
    }
    expect(tree.props.children[1].props.children[0].props.className).toContain('ring-2')
  }
})
