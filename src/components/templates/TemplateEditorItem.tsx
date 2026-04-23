import { useState, type FormEvent } from 'react'

import type { TemplateWithExercises } from '../../db/templates'
import {
  emptyTemplateExerciseDraft,
  toTemplateExerciseDraft,
  type TemplateExerciseDraft,
} from '../../lib/template-editor'
import { TemplateExerciseCreateForm } from './TemplateExerciseCreateForm'
import { TemplateExerciseEditor } from './TemplateExerciseEditor'

type TemplateEditorItemProps = {
  disabled: boolean
  expanded: boolean
  template: TemplateWithExercises
  onCreateExercise: (templateId: string, draft: TemplateExerciseDraft) => Promise<void>
  onDeleteExercise: (templateId: string, exerciseId: string) => Promise<void>
  onDeleteTemplate: (templateId: string) => Promise<void>
  onSaveExercise: (
    templateId: string,
    exerciseId: string,
    draft: TemplateExerciseDraft,
  ) => Promise<void>
  onSaveTemplateName: (templateId: string, name: string) => Promise<void>
  onToggle: () => void
}

export function TemplateEditorItem({
  disabled,
  expanded,
  template,
  onCreateExercise,
  onDeleteExercise,
  onDeleteTemplate,
  onSaveExercise,
  onSaveTemplateName,
  onToggle,
}: TemplateEditorItemProps) {
  const [nameDraft, setNameDraft] = useState(template.name)
  const [newExerciseDraft, setNewExerciseDraft] = useState<TemplateExerciseDraft>(
    emptyTemplateExerciseDraft,
  )
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, TemplateExerciseDraft>>(
    Object.fromEntries(template.exercises.map((exercise) => [exercise.id, toTemplateExerciseDraft(exercise)])),
  )

  function handleTemplateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void onSaveTemplateName(template.id, nameDraft)
  }

  async function handleCreateExercise() {
    await onCreateExercise(template.id, newExerciseDraft)
    setNewExerciseDraft(emptyTemplateExerciseDraft)
  }

  return (
    <article className="space-y-3 rounded border border-slate-200 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{template.name}</p>
          <p className="text-xs text-slate-500">{template.exercises.length} 个动作</p>
        </div>
        <button type="button" onClick={onToggle} className="rounded border border-slate-300 px-3 py-2 text-sm">
          {expanded ? '收起' : '编辑'}
        </button>
      </div>

      {expanded ? (
        <div className="space-y-3">
          <form className="space-y-3" onSubmit={handleTemplateSubmit}>
            <label className="block space-y-1">
              <span className="text-xs text-slate-500">模板名称</span>
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                className="w-full rounded border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={disabled}
                className="rounded border border-slate-900 bg-slate-900 px-3 py-2 text-sm text-white disabled:border-slate-300 disabled:bg-slate-300"
              >
                保存模板
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void onDeleteTemplate(template.id)}
                className="rounded border border-rose-300 px-3 py-2 text-sm text-rose-700 disabled:border-rose-200 disabled:text-rose-300"
              >
                删除模板
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {template.exercises.length === 0 ? <p>这个模板还没有动作。</p> : null}

            {template.exercises.map((exercise) => {
              const draft = exerciseDrafts[exercise.id] ?? toTemplateExerciseDraft(exercise)

              return (
                <TemplateExerciseEditor
                  key={exercise.id}
                  disabled={disabled}
                  draft={draft}
                  exerciseId={exercise.id}
                  onChange={(nextDraft) =>
                    setExerciseDrafts((current) => ({
                      ...current,
                      [exercise.id]: nextDraft,
                    }))
                  }
                  onDelete={(exerciseId) => onDeleteExercise(template.id, exerciseId)}
                  onSave={(exerciseId, nextDraft) =>
                    onSaveExercise(template.id, exerciseId, nextDraft)
                  }
                />
              )
            })}
          </div>

          <TemplateExerciseCreateForm
            disabled={disabled}
            draft={newExerciseDraft}
            onChange={setNewExerciseDraft}
            onSubmit={handleCreateExercise}
          />
        </div>
      ) : null}
    </article>
  )
}
