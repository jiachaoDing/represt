import type { MeasurementType } from '../domain/exercise-catalog'
import { resolveCatalogExerciseId } from '../lib/exercise-name'
import { getMeasurementTypeForExercise } from '../lib/set-record-measurement'
import { getTodaySessionDateKey, parseSessionDateKey } from '../lib/session-date-key'
import type { PerformedExercise, SetRecord } from '../models/types'
import { db } from './app-db'

export type SummaryTrainingHeatmapExercise = {
  catalogExerciseId: string | null
  completedSets: number
  firstCompletedAt: string | null
  id: string
  lastCompletedAt: string | null
  measurementType: MeasurementType
  name: string
  setRecords: SetRecord[]
}

export type SummaryTrainingHeatmapDay = {
  completedSets: number
  dateKey: string
  exerciseCount: number
  exercises: SummaryTrainingHeatmapExercise[]
  firstCompletedAt: string | null
  lastCompletedAt: string | null
}

export type SummaryTrainingHeatmapData = {
  days: SummaryTrainingHeatmapDay[]
  endDateKey: string
  maxCompletedSets: number
  startDateKey: string
  totalCompletedSets: number
}

function dateToSessionDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getHeatmapRange(selectedDateKey: string) {
  const selectedDate = parseSessionDateKey(selectedDateKey) ?? new Date()
  const monthEndDateKey = dateToSessionDateKey(
    new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0),
  )
  const todayDateKey = getTodaySessionDateKey()
  const endDateKey = monthEndDateKey > todayDateKey ? todayDateKey : monthEndDateKey
  const endDate = parseSessionDateKey(endDateKey) ?? selectedDate
  const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 11, 1)

  return {
    endDateKey,
    startDateKey: dateToSessionDateKey(startDate),
  }
}

function getExerciseMergeKey(exercise: Pick<PerformedExercise, 'catalogExerciseId' | 'id' | 'name'>) {
  const catalogExerciseId = resolveCatalogExerciseId(exercise)
  if (catalogExerciseId) {
    return `catalog:${catalogExerciseId}`
  }

  const normalizedName = exercise.name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ')
  return normalizedName ? `name:${normalizedName}` : `exercise:${exercise.id}`
}

function createEmptyDay(dateKey: string): SummaryTrainingHeatmapDay {
  return {
    completedSets: 0,
    dateKey,
    exerciseCount: 0,
    exercises: [],
    firstCompletedAt: null,
    lastCompletedAt: null,
  }
}

function getDateKeysInRange(startDateKey: string, endDateKey: string) {
  const startDate = parseSessionDateKey(startDateKey)
  const endDate = parseSessionDateKey(endDateKey)
  if (!startDate || !endDate) {
    return [] satisfies string[]
  }

  const dateKeys: string[] = []
  const currentDate = new Date(startDate)

  while (currentDate.getTime() <= endDate.getTime()) {
    dateKeys.push(dateToSessionDateKey(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return dateKeys
}

export async function getSummaryTrainingHeatmap(selectedDateKey: string) {
  const { endDateKey, startDateKey } = getHeatmapRange(selectedDateKey)
  const dateKeys = getDateKeysInRange(startDateKey, endDateKey)
  const daysByDateKey = new Map(dateKeys.map((dateKey) => [dateKey, createEmptyDay(dateKey)]))
  const exerciseGroupsByDateKey = new Map<string, Map<string, SummaryTrainingHeatmapExercise>>()
  const [sessions, performedExercises, setRecords] = await Promise.all([
    db.workoutSessions.toArray(),
    db.performedExercises.toArray(),
    db.setRecords.orderBy('completedAt').toArray(),
  ])
  const sessionsById = new Map(sessions.map((session) => [session.id, session]))
  const performedExercisesById = new Map(performedExercises.map((exercise) => [exercise.id, exercise]))

  for (const setRecord of setRecords) {
    const session = sessionsById.get(setRecord.sessionId)
    const day = session ? daysByDateKey.get(session.sessionDateKey) : undefined
    if (!day) {
      continue
    }

    day.completedSets += 1
    day.firstCompletedAt =
      day.firstCompletedAt && day.firstCompletedAt < setRecord.completedAt
        ? day.firstCompletedAt
        : setRecord.completedAt
    day.lastCompletedAt =
      day.lastCompletedAt && day.lastCompletedAt > setRecord.completedAt
        ? day.lastCompletedAt
        : setRecord.completedAt

    const exercise = performedExercisesById.get(setRecord.performedExerciseId)
    if (!exercise) {
      continue
    }

    const mergeKey = getExerciseMergeKey(exercise)
    const exerciseGroups = exerciseGroupsByDateKey.get(day.dateKey) ?? new Map()
    const currentGroup = exerciseGroups.get(mergeKey)
    if (currentGroup) {
      currentGroup.completedSets += 1
      currentGroup.setRecords.push(setRecord)
      currentGroup.firstCompletedAt =
        currentGroup.firstCompletedAt && currentGroup.firstCompletedAt < setRecord.completedAt
          ? currentGroup.firstCompletedAt
          : setRecord.completedAt
      currentGroup.lastCompletedAt =
        currentGroup.lastCompletedAt && currentGroup.lastCompletedAt > setRecord.completedAt
          ? currentGroup.lastCompletedAt
          : setRecord.completedAt
      continue
    }

    exerciseGroups.set(mergeKey, {
      catalogExerciseId: resolveCatalogExerciseId(exercise),
      completedSets: 1,
      firstCompletedAt: setRecord.completedAt,
      id: mergeKey,
      lastCompletedAt: setRecord.completedAt,
      measurementType: getMeasurementTypeForExercise(exercise),
      name: exercise.name,
      setRecords: [setRecord],
    })
    exerciseGroupsByDateKey.set(day.dateKey, exerciseGroups)
  }

  const days = Array.from(daysByDateKey.values()).map((day) => {
    const exercises = Array.from(exerciseGroupsByDateKey.get(day.dateKey)?.values() ?? [])
      .map((exercise) => ({
        ...exercise,
        setRecords: [...exercise.setRecords].sort((left, right) =>
          left.completedAt.localeCompare(right.completedAt),
        ),
      }))
      .sort((left, right) => (left.firstCompletedAt ?? '').localeCompare(right.firstCompletedAt ?? ''))

    return {
      ...day,
      exerciseCount: exercises.length,
      exercises,
    } satisfies SummaryTrainingHeatmapDay
  })

  return {
    days,
    endDateKey,
    maxCompletedSets: Math.max(0, ...days.map((day) => day.completedSets)),
    startDateKey,
    totalCompletedSets: days.reduce((total, day) => total + day.completedSets, 0),
  } satisfies SummaryTrainingHeatmapData
}
