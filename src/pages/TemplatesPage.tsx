import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { SectionCard } from '../components/SectionCard'
import {
  createTemplate,
  createTemplateExercise,
  deleteTemplate,
  deleteTemplateExercise,
  listTemplatesWithExercises,
  type TemplateWithExercises,
  updateTemplateExercise,
  updateTemplateName,
} from '../db/templates'

type ExerciseDraft = {
  name: string
  targetSets: string
  restSeconds: string
}

const emptyExerciseDraft: ExerciseDraft = {
  name: '',
  targetSets: '3',
  restSeconds: '90',
}

function toExerciseDraft(input?: {
  name: string
  targetSets: number
  restSeconds: number
}): ExerciseDraft {
  if (!input) {
    return emptyExerciseDraft
  }

  return {
    name: input.name,
    targetSets: String(input.targetSets),
    restSeconds: String(input.restSeconds),
  }
}

function parseNumberInput(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [newTemplateName, setNewTemplateName] = useState('')
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadTemplates(preferredTemplateId?: string | null) {
    const items = await listTemplatesWithExercises()
    setTemplates(items)
    setExpandedTemplateId((current) => {
      if (preferredTemplateId !== undefined) {
        return items.some((template) => template.id === preferredTemplateId)
          ? preferredTemplateId
          : (items[0]?.id ?? null)
      }

      return items.some((template) => template.id === current) ? current : (items[0]?.id ?? null)
    })
  }

  async function runMutation(action: () => Promise<void>) {
    try {
      setIsSubmitting(true)
      setError(null)
      await action()
    } catch (mutationError) {
      console.error(mutationError)
      setError('模板数据保存失败，请重试。')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        setError(null)
        await loadTemplates()
      } catch (loadError) {
        console.error(loadError)
        setError('模板数据加载失败，请刷新页面后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [])

  async function handleCreateTemplate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    await runMutation(async () => {
      const template = await createTemplate(newTemplateName)
      setNewTemplateName('')
      await loadTemplates(template.id)
    })
  }

  async function handleSaveTemplateName(templateId: string, name: string) {
    await runMutation(async () => {
      await updateTemplateName(templateId, name)
      await loadTemplates(templateId)
    })
  }

  async function handleDeleteTemplate(templateId: string) {
    if (!window.confirm('删除模板后，该模板下的动作也会一起删除。确定继续吗？')) {
      return
    }

    await runMutation(async () => {
      await deleteTemplate(templateId)
      await loadTemplates()
    })
  }

  async function handleCreateExercise(templateId: string, draft: ExerciseDraft) {
    await runMutation(async () => {
      await createTemplateExercise(templateId, {
        name: draft.name,
        targetSets: parseNumberInput(draft.targetSets),
        restSeconds: parseNumberInput(draft.restSeconds),
      })
      await loadTemplates(templateId)
    })
  }

  async function handleSaveExercise(
    templateId: string,
    exerciseId: string,
    draft: ExerciseDraft,
  ) {
    await runMutation(async () => {
      await updateTemplateExercise(exerciseId, {
        name: draft.name,
        targetSets: parseNumberInput(draft.targetSets),
        restSeconds: parseNumberInput(draft.restSeconds),
      })
      await loadTemplates(templateId)
    })
  }

  async function handleDeleteExercise(templateId: string, exerciseId: string) {
    await runMutation(async () => {
      await deleteTemplateExercise(exerciseId)
      await loadTemplates(templateId)
    })
  }

  return (
    <div className="space-y-4">
      <SectionCard title="新建模板">
        <form className="space-y-3" onSubmit={handleCreateTemplate}>
          <label className="block space-y-2">
            <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
              模板名称
            </span>
            <input
              value={newTemplateName}
              onChange={(event) => setNewTemplateName(event.target.value)}
              placeholder="例如：推拉腿 A"
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
            />
          </label>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            新建模板
          </button>
        </form>
        <p>模板和动作数据仅保存在当前设备的 Dexie 本地数据库中。</p>
      </SectionCard>

      <SectionCard
        title="模板列表"
        action={
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {templates.length} 个模板
          </span>
        }
      >
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {isLoading ? <p>正在读取模板数据...</p> : null}

        {!isLoading && templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            还没有模板，先创建一个。
          </div>
        ) : null}

        <div className="space-y-3">
          {templates.map((template) => (
            <TemplateCard
              key={`${template.id}:${template.updatedAt}`}
              template={template}
              expanded={expandedTemplateId === template.id}
              disabled={isSubmitting}
              onToggle={() =>
                setExpandedTemplateId((current) => (current === template.id ? null : template.id))
              }
              onSaveTemplateName={handleSaveTemplateName}
              onDeleteTemplate={handleDeleteTemplate}
              onCreateExercise={handleCreateExercise}
              onSaveExercise={handleSaveExercise}
              onDeleteExercise={handleDeleteExercise}
            />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="页面范围">
        <ul className="space-y-2">
          <li>这里只维护长期模板，不影响已开始的本次训练。</li>
          <li>动作编辑只覆盖动作名、目标组数和休息秒数。</li>
          <li>当前未实现动作拖拽排序、复制模板和搜索筛选。</li>
        </ul>
        <div className="pt-1">
          <Link
            to="/"
            className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            返回训练安排
          </Link>
        </div>
      </SectionCard>
    </div>
  )
}

type TemplateCardProps = {
  template: TemplateWithExercises
  expanded: boolean
  disabled: boolean
  onToggle: () => void
  onSaveTemplateName: (templateId: string, name: string) => Promise<void>
  onDeleteTemplate: (templateId: string) => Promise<void>
  onCreateExercise: (templateId: string, draft: ExerciseDraft) => Promise<void>
  onSaveExercise: (templateId: string, exerciseId: string, draft: ExerciseDraft) => Promise<void>
  onDeleteExercise: (templateId: string, exerciseId: string) => Promise<void>
}

function TemplateCard({
  template,
  expanded,
  disabled,
  onToggle,
  onSaveTemplateName,
  onDeleteTemplate,
  onCreateExercise,
  onSaveExercise,
  onDeleteExercise,
}: TemplateCardProps) {
  const [nameDraft, setNameDraft] = useState(template.name)
  const [newExerciseDraft, setNewExerciseDraft] = useState<ExerciseDraft>(emptyExerciseDraft)
  const [exerciseDrafts, setExerciseDrafts] = useState<Record<string, ExerciseDraft>>(
    Object.fromEntries(template.exercises.map((exercise) => [exercise.id, toExerciseDraft(exercise)])),
  )

  async function handleTemplateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSaveTemplateName(template.id, nameDraft)
  }

  async function handleCreateExerciseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onCreateExercise(template.id, newExerciseDraft)
    setNewExerciseDraft(emptyExerciseDraft)
  }

  return (
    <article className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-semibold text-slate-900">{template.name}</p>
          <p className="text-xs text-slate-500">{template.exercises.length} 个动作</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="rounded-full border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700"
        >
          {expanded ? '收起' : '编辑'}
        </button>
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4">
          <form className="space-y-3" onSubmit={handleTemplateSubmit}>
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                模板名称
              </span>
              <input
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={disabled}
                className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                保存模板
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => void onDeleteTemplate(template.id)}
                className="rounded-full border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:text-rose-300"
              >
                删除
              </button>
            </div>
          </form>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">动作列表</h3>
              <span className="text-xs text-slate-500">按创建顺序展示</span>
            </div>

            {template.exercises.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-center text-sm text-slate-500">
                这个模板还没有动作。
              </div>
            ) : null}

            {template.exercises.map((exercise) => {
              const draft = exerciseDrafts[exercise.id] ?? toExerciseDraft(exercise)

              return (
                <form
                  key={exercise.id}
                  className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void onSaveExercise(template.id, exercise.id, draft)
                  }}
                >
                  <label className="block space-y-2">
                    <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      动作名
                    </span>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setExerciseDrafts((current) => ({
                          ...current,
                          [exercise.id]: { ...draft, name: event.target.value },
                        }))
                      }
                      className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                    />
                  </label>

                  <div className="grid grid-cols-2 gap-3">
                    <label className="block space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        目标组数
                      </span>
                      <input
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={draft.targetSets}
                        onChange={(event) =>
                          setExerciseDrafts((current) => ({
                            ...current,
                            [exercise.id]: { ...draft, targetSets: event.target.value },
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      />
                    </label>

                    <label className="block space-y-2">
                      <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                        休息秒数
                      </span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={draft.restSeconds}
                        onChange={(event) =>
                          setExerciseDrafts((current) => ({
                            ...current,
                            [exercise.id]: { ...draft, restSeconds: event.target.value },
                          }))
                        }
                        className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                      />
                    </label>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={disabled}
                      className="flex-1 rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      保存动作
                    </button>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => void onDeleteExercise(template.id, exercise.id)}
                      className="rounded-full border border-rose-200 px-4 py-3 text-sm font-medium text-rose-700 disabled:cursor-not-allowed disabled:text-rose-300"
                    >
                      删除
                    </button>
                  </div>
                </form>
              )
            })}
          </div>

          <form
            className="space-y-3 rounded-2xl border border-dashed border-slate-300 bg-white/80 p-4"
            onSubmit={handleCreateExerciseSubmit}
          >
            <h3 className="text-sm font-semibold text-slate-900">新增动作</h3>

            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                动作名
              </span>
              <input
                value={newExerciseDraft.name}
                onChange={(event) =>
                  setNewExerciseDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="例如：引体向上"
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  目标组数
                </span>
                <input
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={newExerciseDraft.targetSets}
                  onChange={(event) =>
                    setNewExerciseDraft((current) => ({
                      ...current,
                      targetSets: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  休息秒数
                </span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={newExerciseDraft.restSeconds}
                  onChange={(event) =>
                    setNewExerciseDraft((current) => ({
                      ...current,
                      restSeconds: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={disabled}
              className="w-full rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              添加动作
            </button>
          </form>
        </div>
      ) : null}
    </article>
  )
}
