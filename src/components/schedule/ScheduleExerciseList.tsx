import { Link } from 'react-router-dom'

import { SectionCard } from '../ui/SectionCard'
import type { WorkoutSessionWithExercises } from '../../db/sessions'
import { getExerciseRestLabel, getExerciseStatusLabel } from '../../lib/session-display'

type ScheduleExerciseListProps = {
  currentSession: WorkoutSessionWithExercises | null
  isSubmitting: boolean
  now: number
  onDeleteExercise: (sessionExerciseId: string) => Promise<void>
}

export function ScheduleExerciseList({
  currentSession,
  isSubmitting,
  now,
  onDeleteExercise,
}: ScheduleExerciseListProps) {
  return (
    <SectionCard
      title="动作列表"
      action={
        currentSession ? (
          <span className="rounded border border-slate-300 px-2 py-1 text-xs">
            {currentSession.exercises.length} 个动作
          </span>
        ) : null
      }
    >
      {!currentSession ? <p>先创建本次训练，再进入动作列表。</p> : null}

      {currentSession && currentSession.exercises.length === 0 ? <p>当前训练还没有动作。</p> : null}

      {currentSession ? (
        <div className="space-y-2">
          {currentSession.exercises.map((exercise) => (
            <div key={exercise.id} className="flex items-start justify-between gap-3 rounded border border-slate-200 p-3">
              <Link to={`/exercise/${exercise.id}`} className="min-w-0 flex-1 space-y-1">
                <p className="font-medium">{exercise.name}</p>
                <p className="text-xs text-slate-500">
                  {exercise.completedSets} / {exercise.targetSets} 组 · {getExerciseStatusLabel(exercise.status)}
                </p>
                <p className="text-xs text-slate-500">
                  休息 {exercise.restSeconds} 秒 · {getExerciseRestLabel(exercise, now)}
                </p>
              </Link>

              {currentSession.status === 'pending' && exercise.status === 'pending' ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void onDeleteExercise(exercise.id)}
                  className="rounded border border-rose-300 px-3 py-2 text-xs text-rose-700 disabled:border-rose-200 disabled:text-rose-300"
                >
                  删除
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </SectionCard>
  )
}
