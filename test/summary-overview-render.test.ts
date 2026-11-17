import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { I18nextProvider } from 'react-i18next'
import i18next from 'i18next'
import { afterAll, beforeAll, expect, it, vi } from 'vitest'
import { SummaryPage } from '../src/pages/SummaryPage'
import { SummaryTrainingHeatmap } from '../src/components/summary/SummaryTrainingHeatmap'
import { TrainingDurationPage } from '../src/pages/TrainingDurationPage'
import type { GrowthSnapshot } from '../src/lib/training-growth'
import zh from '../src/locales/zh-CN/common'
import en from '../src/locales/en/common'

vi.mock('../src/i18n', () => ({ default: { t: (key: string) => key } }))
vi.mock('../src/hooks/pages/useTrainingGrowth', () => ({
  useTrainingGrowth: () => ({ snapshot, error: false, retry: () => {} }),
}))

const snapshot: GrowthSnapshot = {
  sessions: [{ id: 'session', sessionDateKey: '2026-11-17', createdAt: '', plannedPlanId: 'upper' }],
  exercises: Array.from({ length: 5 }, (_, index) => ({
    id: `exercise-${index}`, sessionId: 'session', name: `Custom ${index}`, measurementType: 'weightReps',
    planItemId: null, planExerciseId: null, targetSets: 3, completedSets: 1, restSeconds: 60,
    order: index, startedAt: '', lastCompletedAt: null, restEndsAt: null,
  })),
  records: Array.from({ length: 5 }, (_, index) => ({
    id: `record-${index}`, sessionId: 'session', performedExerciseId: `exercise-${index}`,
    setNumber: 1, completedAt: `2026-11-17T08:${String(index * 10).padStart(2, '0')}:00`,
    weightKg: 50, reps: 8, durationSeconds: null, distanceMeters: null,
  })),
  plans: [], profiles: [], sessionPlanItems: [], workoutPlans: [{ id: 'upper', name: 'Upper', createdAt: '', updatedAt: '' }],
}
const translator = i18next.createInstance()

beforeAll(async () => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-17T12:00:00'))
  vi.stubGlobal('localStorage', { getItem: () => null })
  await translator.init({
    lng: 'zh-CN', interpolation: { escapeValue: false },
    resources: { 'zh-CN': { translation: zh }, en: { translation: en } },
  })
})

afterAll(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('keeps the home overview to three exercise links, habit map and history in both languages', async () => {
  for (const language of ['zh-CN', 'en']) {
    await translator.changeLanguage(language)
    const html = renderToStaticMarkup(createElement(I18nextProvider, { i18n: translator },
      createElement(MemoryRouter, { initialEntries: ['/summary'] }, createElement(SummaryPage))))
    expect((html.match(/href="\/summary\/exercises\/name%3A/g) ?? []).length).toBe(3)
    expect(html).toContain('href="/calendar"')
    expect(html).toContain('href="/summary/heatmap"')
    expect(html).not.toContain('<select')
    expect(html).not.toContain('recharts')
    expect(html).not.toContain('growth.compact.')
    expect(html).not.toContain('阶段中位数')
    expect(html.indexOf('href="/summary/heatmap"')).toBeLessThan(html.indexOf('id="growth-performance"'))
    expect(html).toContain('href="/summary/duration"')
    expect(html.indexOf('href="/summary/duration"')).toBeLessThan(html.indexOf('href="/summary/heatmap"'))
    expect(html).toContain(translator.t('common.minutes', { value: 40 }))
    expect(html).toMatch(new RegExp(`<h1[^>]*>${translator.t('nav.summary')}</h1>`))
    expect(html).toContain('items-center text-center')
    expect(html).toContain('grid grid-rows-7')
    expect(html).toContain('repeat(52, calc((100% - 51px) / 18))')
    expect(html).not.toContain(translator.t('growth.compact.daysIn28'))
    expect(html).not.toContain('duration.status.')
    expect(html).toContain(translator.t('duration.viewTrend'))
    expect(html).toContain('aspect-square rounded-full')
    expect(html).toContain('background-color:color-mix(in srgb, var(--plan-2) 33.33%, var(--heatmap-level-0))')
    const exerciseCards = html.match(/<a[^>]*href="\/summary\/exercises\/name%3A[^>]*>/g) ?? []
    expect(exerciseCards.every((card) => card.includes('rounded-[1.25rem]') && card.includes('border-[var(--outline-variant)]/20'))).toBe(true)
  }
})

it('renders the annual heatmap without date selection or an expanded record panel', () => {
  const html = renderToStaticMarkup(createElement(I18nextProvider, { i18n: translator },
    createElement(SummaryTrainingHeatmap, {
      isLoading: false, error: false,
      data: {
        startDateKey: '2026-11-01', endDateKey: '2026-11-17', totalCompletedSets: 1, maxCompletedSets: 1,
        days: [{ dateKey: '2026-11-17', planColor: 'var(--plan-2)', completedSets: 1, exerciseCount: 1, exercises: [], firstCompletedAt: null, lastCompletedAt: null }],
      },
    })))
  expect(html).not.toContain('<button')
  expect(html).not.toContain('<select')
  expect(html).not.toContain('href=')
  expect(html).not.toContain('selectDay')
  expect(html).toContain('grid-cols-7')
  expect(html).toContain('aspect-square rounded-full')
  expect(html).toContain('background-color:var(--plan-2)')
})

it('opens duration analysis with a trend, method and links to dated records', () => {
  const html = renderToStaticMarkup(createElement(I18nextProvider, { i18n: translator },
    createElement(MemoryRouter, { initialEntries: ['/summary/duration'] }, createElement(TrainingDurationPage))))
  expect(html).toContain(translator.t('duration.analysisTitle'))
  expect(html).toContain(translator.t('duration.trend'))
  expect(html).toContain(translator.t('duration.methodTitle'))
  expect(html).toContain(translator.t('duration.timeOfDay'))
  expect(html).toContain('href="/summary?date=2026-11-17"')
  expect(html).not.toContain('duration.status.')
})
