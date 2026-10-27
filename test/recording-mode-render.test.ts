import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { beforeAll, expect, it, vi } from 'vitest'
import i18next from 'i18next'
import { I18nextProvider } from 'react-i18next'

import { useExercisePageData } from '../src/hooks/pages/useExercisePageData'
import { ExerciseRecordInlineCard } from '../src/components/exercise/ExerciseRecordInlineCard'
import { PlanExerciseInlineEditor } from '../src/components/plans/PlanExerciseInlineEditor'
import { ExerciseHero } from '../src/components/exercise/ExerciseHero'
import type { ScheduleExerciseDetail } from '../src/db/session-types'
import { emptyPlanExerciseDraft } from '../src/lib/plan-editor'
import type { MeasurementType } from '../src/domain/exercise-catalog'
import zh from '../src/locales/zh-CN/common'

vi.mock('../src/i18n', () => ({ default: { t: (key: string) => key } }))

const translator = i18next.createInstance()
beforeAll(async () => {
  await translator.init({ lng: 'zh-CN', interpolation: { escapeValue: false }, resources: { 'zh-CN': { translation: zh } } })
})

it('renders the exercise hook safely before details and the latest set are loaded', () => {
  function InitialExercise() {
    const state = useExercisePageData('unloaded')
    expect(state.detail).toBeNull()
    expect(state.latestSetRecord).toBeNull()
    expect(state.recordMeasurementType).toBe('weightReps')
    return null
  }
  expect(() => renderToStaticMarkup(createElement(InitialExercise))).not.toThrow()
})

it('renders the selected supplement fields and two independently labelled weights without explanatory text', () => {
  const expectedCounts: Array<[MeasurementType, number]> = [
    ['weightReps', 2], ['leftRightWeightReps', 4], ['reps', 1], ['durationReps', 2], ['duration', 1],
  ]
  for (const [measurementType, count] of expectedCounts) {
    const html = renderToStaticMarkup(createElement(I18nextProvider, { i18n: translator },
      createElement(ExerciseRecordInlineCard, {
        isSubmitting: false, measurementType, weightInput: '20', repsInput: '10',
        rightWeightInput: '15', rightRepsInput: '8', durationInput: '30', distanceInput: '',
        latestSetRecord: { id: 'set', sessionId: 'session', performedExerciseId: 'exercise', setNumber: 1,
          completedAt: '2026-10-27T10:00:00Z', weightKg: 20, reps: 10, durationSeconds: null, distanceMeters: null },
        onRecordingModeChange: () => {}, onRightWeightChange: () => {}, onRightRepsChange: () => {},
        onWeightChange: () => {}, onRepsChange: () => {}, onDurationChange: () => {}, onDistanceChange: () => {},
        onCancel: () => {}, onSubmit: () => {},
      })))
    expect((html.match(/<input/g) ?? []).length).toBe(count)
    expect(html.replace(/<[^>]+>/g, '')).not.toContain('当前：')
    if (measurementType === 'leftRightWeightReps') {
      expect(html).toContain('aria-label="左侧 · 重量 (kg)"')
      expect(html).toContain('aria-label="右侧 · 重量 (kg)"')
    }
  }
})

it('provides separate left and right default weights in the exercise editor', () => {
  const html = renderToStaticMarkup(createElement(I18nextProvider, { i18n: translator },
    createElement(PlanExerciseInlineEditor, {
      draft: { ...emptyPlanExerciseDraft, measurementType: 'leftRightWeightReps' },
      isEditing: true, isSubmitting: false,
      onCancel: () => {}, onDraftChange: () => {}, onSubmit: () => {},
    })))
  expect(html).toContain('aria-label="左侧 · 默认重量 (kg)"')
  expect(html).toContain('aria-label="右侧 · 默认重量 (kg)"')
  expect(html.replace(/<[^>]+>/g, '')).not.toContain('当前：')
})

it('shows saved-mode PR fields and displays winning bilateral records as left/right values', () => {
  const detail: ScheduleExerciseDetail = {
    session: { id: 'session', sessionDateKey: '2026-10-27', createdAt: '2026-10-27T10:00:00Z', status: 'active' },
    exercise: { id: 'exercise', sessionId: 'session', planExerciseId: null, name: 'Custom', createdAt: '2026-10-27T10:00:00Z',
      measurementType: 'weightReps', targetSets: 4, completedSets: 1, restSeconds: 0, order: 0,
      performedExerciseId: 'performed', lastCompletedAt: null, restEndsAt: null, status: 'active' },
    latestSetRecord: { id: 'set', sessionId: 'session', performedExerciseId: 'performed', setNumber: 1,
      completedAt: '2026-10-27T10:00:00Z', measurementType: 'leftRightWeightReps', weightKg: 40,
      rightWeightKg: 20, reps: 10, rightReps: 14, durationSeconds: null, distanceMeters: null },
    previousSetRecord: null,
    personalRecords: { weightKg: 60, reps: 12, weightSides: [40, 20], repsSides: [10, 14] },
  }
  const render = () => renderToStaticMarkup(createElement(I18nextProvider, { i18n: translator },
    createElement(ExerciseHero, { detail, now: Date.parse('2026-10-27T11:00:00Z') }))).replace(/<[^>]+>/g, '')
  const bilateral = render()
  expect(bilateral).toContain(translator.t('exercise.prWeight'))
  expect(bilateral).toContain('40/20')
  expect(bilateral).toContain('10/14')
  detail.latestSetRecord!.measurementType = 'duration'
  expect(render()).not.toContain(translator.t('exercise.prWeight'))
  expect(render()).not.toContain(translator.t('exercise.prReps'))
  detail.latestSetRecord!.measurementType = 'reps'
  expect(render()).not.toContain(translator.t('exercise.prWeight'))
  expect(render()).toContain(translator.t('exercise.prReps'))
})
