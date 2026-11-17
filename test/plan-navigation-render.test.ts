import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, expect, it } from 'vitest'
import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'

import { PlanExerciseCard } from '../src/components/plans/PlanExerciseCard'
import { TrainingCycleDots } from '../src/components/training-cycle/TrainingCycleDots'
import { TrainingCycleSlotRow } from '../src/components/training-cycle/TrainingCycleSlotRow'
import { getPlanColor } from '../src/lib/plan-color'
import type { PlanExercise } from '../src/models/types'
import zh from '../src/locales/zh-CN/common'

const translator = i18next.createInstance()
beforeAll(async () => {
  await translator.init({ lng: 'zh-CN', interpolation: { escapeValue: false }, resources: { 'zh-CN': { translation: zh } } })
})

function renderCard(values: Partial<PlanExercise>) {
  return renderToStaticMarkup(createElement(I18nextProvider, { i18n: translator },
    createElement(PlanExerciseCard, {
      exercise: { id: 'exercise', planId: 'plan', name: 'Custom', order: 0,
        targetSets: 3, restSeconds: 120, measurementType: 'weightReps', ...values },
      index: 0, isSubmitting: false,
    })))
}

it('keeps parameters on one line in order and retains explicit zero values', () => {
  const html = renderCard({ reps: 10, weightKg: 0 })
  const text = html.replace(/<[^>]+>/g, '')
  expect(text).toContain('3 组10 次120 秒0 kg')
  expect(html).toContain('flex-nowrap')
  expect(html).toContain('whitespace-nowrap')
  expect(html).toContain('overflow-x-auto')
  expect(html).not.toContain('flex-wrap ')
})

it('hides missing and non-finite parameters without placeholders', () => {
  for (const weightKg of [undefined, null, NaN, Infinity]) {
    const text = renderCard({ weightKg, reps: null }).replace(/<[^>]+>/g, '')
    expect(text).toBe('1Custom3 组120 秒')
  }
  expect(renderCard({ reps: 0 }).replace(/<[^>]+>/g, '')).toContain('0 次')
})

it('renders duration/reps and bilateral values using their measurement modes', () => {
  expect(renderCard({ measurementType: 'durationReps', reps: 8, durationSeconds: 30 })
    .replace(/<[^>]+>/g, '')).toContain('3 组8 次120 秒30 秒')
  expect(renderCard({ measurementType: 'leftRightWeightReps', reps: 10, rightReps: 8,
    weightKg: 0, rightWeightKg: 15 }).replace(/<[^>]+>/g, ''))
    .toContain('3 组10/8 次120 秒0/15 kg')
})

it('selects each cycle slot including rest without changing slots or today', () => {
  const slots = [{ id: 'a', planId: 'plan' }, { id: 'b', planId: null }, { id: 'c', planId: 'plan' }]
  const original = structuredClone(slots)
  const selections: number[] = []
  const tree = TrainingCycleDots({ slots, currentIndex: 0, selectedIndex: 2,
    getPlanColor: () => null, getDayLabel: (index) => `Day ${index + 1}`,
    onSelect: (index) => selections.push(index) })
  for (const button of tree.props.children) button.props.onClick()
  expect(selections).toEqual([0, 1, 2])
  expect(slots).toEqual(original)
  expect(tree.props.children[0].props['aria-current']).toBe('date')
  expect(tree.props.children[0].props.children[1].props.className).toContain('h-1 w-1')
  expect(tree.props.children[0].props['aria-pressed']).toBe(false)
  expect(tree.props.children[2].props['aria-pressed']).toBe(true)
  expect(tree.props.children[1].props.className).toContain('h-11 w-11')
})

it('keeps schedule rows soft and exposes today independently of selection', () => {
  const color = getPlanColor(1)
  for (const isToday of [false, true]) {
    const html = renderToStaticMarkup(createElement(I18nextProvider, { i18n: translator },
      createElement(TrainingCycleSlotRow, {
        color, index: 0, isSubmitting: false, isToday,
        onCalibrateToday: () => {}, onOpenSheet: () => {},
        slot: { id: 'slot', planId: 'plan' }, weekdayLabel: 'Monday',
        plan: { id: 'plan', name: 'Upper', createdAt: '', updatedAt: '', exercises: [] },
      })))
    const card = [...html.matchAll(/<button\b[^>]*>/g)][1][0]
    expect(card).toContain(`background-color:${color.soft}`)
    expect(card).toContain(`color:${color.text}`)
    expect(html).not.toContain('var(--cycle-focus)')
    expect(html).not.toContain('aria-pressed')
    expect(html.includes('aria-current="date"')).toBe(isToday)
  }
})
