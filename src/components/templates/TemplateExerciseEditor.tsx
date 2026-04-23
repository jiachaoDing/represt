import type { FormEvent } from 'react'

import type { TemplateExerciseDraft } from '../../lib/template-editor'

type TemplateExerciseEditorProps = {
  disabled: boolean
  draft: TemplateExerciseDraft
  exerciseId: string
  onChange: (draft: TemplateExerciseDraft) => void
  onDelete: (exerciseId: string) => Promise<void>
  onSave: (exerciseId: string, draft: TemplateExerciseDraft) => Promise<void>
}

export function TemplateExerciseEditor({
  disabled,
  draft,
  exerciseId,
  onChange,
  onDelete,
  onSave,
}: TemplateExerciseEditorProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSave(exerciseId, draft)
  }

  return (
    <form className="space-y-2 rounded border border-slate-200 p-3" onSubmit={handleSubmit}>
      <label className="block space-y-1">
        <span className="text-xs text-slate-500">动作名</span>
        <input
          value={draft.name}
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
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
            value={draft.targetSets}
            onChange={(event) => onChange({ ...draft, targetSets: event.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs text-slate-500">休息秒数</span>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={draft.restSeconds}
            onChange={(event) => onChange({ ...draft, restSeconds: event.target.value })}
            className="w-full rounded border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={disabled}
          className="rounded border border-slate-900 bg-slate-900 px-3 py-2 text-sm text-white disabled:border-slate-300 disabled:bg-slate-300"
        >
          保存动作
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => void onDelete(exerciseId)}
          className="rounded border border-rose-300 px-3 py-2 text-sm text-rose-700 disabled:border-rose-200 disabled:text-rose-300"
        >
          删除动作
        </button>
      </div>
    </form>
  )
}
