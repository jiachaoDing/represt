import type { Dispatch, FormEvent, SetStateAction } from 'react'

import { SectionCard } from '../ui/SectionCard'
import type { ScheduleExerciseDraft } from '../../hooks/pages/useSchedulePageData'

type TemporaryExerciseFormProps = {
  canAddTemporaryExercise: boolean
  hasSession: boolean
  isSubmitting: boolean
  newExerciseDraft: ScheduleExerciseDraft
  setNewExerciseDraft: Dispatch<SetStateAction<ScheduleExerciseDraft>>
  onSubmit: () => Promise<void>
}

export function TemporaryExerciseForm({
  canAddTemporaryExercise,
  hasSession,
  isSubmitting,
  newExerciseDraft,
  setNewExerciseDraft,
  onSubmit,
}: TemporaryExerciseFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit()
  }

  return (
    <SectionCard title="新增动作">
      {!hasSession ? <p>请先创建本次训练。</p> : null}

      {hasSession ? (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">动作名</span>
            <input
              value={newExerciseDraft.name}
              disabled={!canAddTemporaryExercise || isSubmitting}
              onChange={(event) =>
                setNewExerciseDraft((current) => ({ ...current, name: event.target.value }))
              }
              className="w-full rounded border border-slate-300 px-3 py-2"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">目标组数</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                value={newExerciseDraft.targetSets}
                disabled={!canAddTemporaryExercise || isSubmitting}
                onChange={(event) =>
                  setNewExerciseDraft((current) => ({
                    ...current,
                    targetSets: event.target.value,
                  }))
                }
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-slate-500">休息秒数</span>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={newExerciseDraft.restSeconds}
                disabled={!canAddTemporaryExercise || isSubmitting}
                onChange={(event) =>
                  setNewExerciseDraft((current) => ({
                    ...current,
                    restSeconds: event.target.value,
                  }))
                }
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          <button
            type="submit"
            disabled={!canAddTemporaryExercise || isSubmitting}
            className="rounded border border-slate-300 px-3 py-2 text-sm disabled:text-slate-300"
          >
            添加到本次训练
          </button>
        </form>
      ) : null}
    </SectionCard>
  )
}
