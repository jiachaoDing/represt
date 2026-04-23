import type { FormEvent } from 'react'

import type { TemplateExerciseDraft } from '../../lib/template-editor'

type TemplateExerciseCreateFormProps = {
  disabled: boolean
  draft: TemplateExerciseDraft
  onChange: (draft: TemplateExerciseDraft) => void
  onSubmit: () => Promise<void>
}

export function TemplateExerciseCreateForm({
  disabled,
  draft,
  onChange,
  onSubmit,
}: TemplateExerciseCreateFormProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSubmit()
  }

  return (
    <form className="space-y-2 rounded border border-dashed border-slate-300 p-3" onSubmit={handleSubmit}>
      <p className="font-medium">新增动作</p>
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

      <button
        type="submit"
        disabled={disabled}
        className="rounded border border-slate-300 px-3 py-2 text-sm disabled:text-slate-300"
      >
        添加动作
      </button>
    </form>
  )
}
