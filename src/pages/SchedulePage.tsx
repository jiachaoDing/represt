import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { SectionCard } from '../components/SectionCard'
import {
  addTemporarySessionExercise,
  createOrRebuildCurrentSession,
  deletePendingSessionExercise,
  getCurrentSession,
  startSession,
  type WorkoutSessionWithExercises,
} from '../db/sessions'
import { listTemplatesWithExercises, type TemplateWithExercises } from '../db/templates'
import type { SessionExerciseStatus, SessionStatus } from '../models/types'

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

function parseNumberInput(value: string) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : undefined
}

function getSessionStatusLabel(status: SessionStatus) {
  if (status === 'active') {
    return '进行中'
  }

  if (status === 'completed') {
    return '已完成'
  }

  return '未开始'
}

function getExerciseStatusLabel(status: SessionExerciseStatus) {
  if (status === 'active') {
    return '进行中'
  }

  if (status === 'completed') {
    return '已完成'
  }

  return '未开始'
}

export function SchedulePage() {
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([])
  const [currentSession, setCurrentSession] = useState<WorkoutSessionWithExercises | null>(null)
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [newExerciseDraft, setNewExerciseDraft] = useState<ExerciseDraft>(emptyExerciseDraft)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadData(preferredTemplateId?: string | null) {
    const [templateItems, session] = await Promise.all([
      listTemplatesWithExercises(),
      getCurrentSession(),
    ])

    setTemplates(templateItems)
    setCurrentSession(session)
    setSelectedTemplateId((current) => {
      if (session?.templateId && templateItems.some((template) => template.id === session.templateId)) {
        return session.templateId
      }

      if (
        preferredTemplateId &&
        templateItems.some((template) => template.id === preferredTemplateId)
      ) {
        return preferredTemplateId
      }

      if (current && templateItems.some((template) => template.id === current)) {
        return current
      }

      return templateItems[0]?.id ?? null
    })
  }

  async function runMutation(action: () => Promise<void>) {
    try {
      setIsSubmitting(true)
      setError(null)
      await action()
    } catch (mutationError) {
      console.error(mutationError)
      setError(
        mutationError instanceof Error ? mutationError.message : '训练安排保存失败，请重试。',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => {
    async function initialize() {
      try {
        setError(null)
        await loadData()
      } catch (loadError) {
        console.error(loadError)
        setError('训练安排加载失败，请刷新页面后重试。')
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [])

  async function handleCreateOrRebuildSession() {
    if (!selectedTemplateId) {
      return
    }

    await runMutation(async () => {
      await createOrRebuildCurrentSession(selectedTemplateId)
      await loadData(selectedTemplateId)
    })
  }

  async function handleStartSession() {
    if (!currentSession) {
      return
    }

    await runMutation(async () => {
      await startSession(currentSession.id)
      await loadData(currentSession.templateId)
    })
  }

  async function handleAddTemporaryExercise(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!currentSession) {
      return
    }

    await runMutation(async () => {
      await addTemporarySessionExercise(currentSession.id, {
        name: newExerciseDraft.name,
        targetSets: parseNumberInput(newExerciseDraft.targetSets),
        restSeconds: parseNumberInput(newExerciseDraft.restSeconds),
      })
      setNewExerciseDraft(emptyExerciseDraft)
      await loadData(currentSession.templateId)
    })
  }

  async function handleDeleteExercise(sessionExerciseId: string) {
    if (!currentSession) {
      return
    }

    if (!window.confirm('删除后不会回写模板。确定删除这个本次训练动作吗？')) {
      return
    }

    await runMutation(async () => {
      await deletePendingSessionExercise(currentSession.id, sessionExerciseId)
      await loadData(currentSession.templateId)
    })
  }

  const currentTemplate = currentSession
    ? templates.find((template) => template.id === currentSession.templateId) ?? null
    : null
  const canChangeTemplate = currentSession === null || currentSession.status === 'pending'
  const canStartSession = currentSession?.status === 'pending'
  const canAddTemporaryExercise = currentSession !== null && currentSession.status !== 'completed'
  const hasTemplates = templates.length > 0
  const needsRebuild =
    currentSession?.status === 'pending' &&
    selectedTemplateId !== null &&
    currentSession.templateId !== selectedTemplateId

  let sessionActionLabel = '基于模板创建本次训练'
  if (currentSession && currentSession.status === 'pending') {
    sessionActionLabel = needsRebuild ? '切换模板并重建本次训练' : '重建当前训练'
  }
  if (currentSession && currentSession.status !== 'pending') {
    sessionActionLabel = '当前训练已开始，不能切换模板'
  }

  return (
    <div className="space-y-4">
      <SectionCard
        title="本次训练"
        action={
          currentSession ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {getSessionStatusLabel(currentSession.status)}
            </span>
          ) : null
        }
      >
        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {isLoading ? <p>正在读取模板和本次训练数据...</p> : null}

        {!isLoading && !hasTemplates ? (
          <div className="space-y-3 rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-500">
            <p>当前还没有模板，先去模板页创建一个训练模板。</p>
            <Link
              to="/templates"
              className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
            >
              去创建模板
            </Link>
          </div>
        ) : null}

        {!isLoading && !hasTemplates && currentSession ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="text-xs text-slate-500">当前模板</p>
              <p className="mt-1 font-medium text-slate-900">
                {currentSession.templateName ?? '尚未关联模板'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 p-3">
              <p className="text-xs text-slate-500">训练状态</p>
              <p className="mt-1 font-medium text-slate-900">
                {getSessionStatusLabel(currentSession.status)}
              </p>
            </div>
          </div>
        ) : null}

        {!isLoading && hasTemplates ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                当前训练模板
              </span>
              <select
                value={selectedTemplateId ?? ''}
                disabled={!canChangeTemplate || isSubmitting}
                onChange={(event) => setSelectedTemplateId(event.target.value || null)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>

            {needsRebuild ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                当前 session 仍基于“{currentSession.templateName ?? '未命名模板'}”，点击按钮后会按新模板重建。
              </div>
            ) : null}

            {!canChangeTemplate && currentSession ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                训练已开始，本次训练模板已锁定。如需重新开始，后续再补多会话管理。
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">当前模板</p>
                <p className="mt-1 font-medium text-slate-900">
                  {currentSession?.templateName ?? '尚未创建本次训练'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-100 p-3">
                <p className="text-xs text-slate-500">训练状态</p>
                <p className="mt-1 font-medium text-slate-900">
                  {currentSession ? getSessionStatusLabel(currentSession.status) : '未创建'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!selectedTemplateId || !canChangeTemplate || isSubmitting}
                onClick={() => void handleCreateOrRebuildSession()}
                className="rounded-full bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {sessionActionLabel}
              </button>
              {canStartSession ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => void handleStartSession()}
                  className="rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  开始训练
                </button>
              ) : null}
            </div>

            {currentTemplate ? (
              <p className="text-xs text-slate-500">
                当前模板共 {currentTemplate.exercises.length} 个模板动作；创建 session 时会复制成独立的
                SessionExercise。
              </p>
            ) : null}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="动作列表"
        action={
          currentSession ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              {currentSession.exercises.length} 个动作
            </span>
          ) : null
        }
      >
        {!currentSession ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            选择模板后创建一条 WorkoutSession，这里会展示从 SessionExercise 读取出的动作列表。
          </div>
        ) : null}

        {currentSession && currentSession.exercises.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
            当前本次训练还没有动作，可以先新增一个临时动作。
          </div>
        ) : null}

        {currentSession ? (
          <div className="space-y-3">
            {currentSession.exercises.map((exercise) => (
              <div
                key={exercise.id}
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
              >
                <Link to={`/exercise/${exercise.id}`} className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-slate-900">{exercise.name}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] text-slate-500">
                      {exercise.templateExerciseId ? '模板动作' : '临时动作'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {exercise.completedSets} / {exercise.targetSets} 组 · 休息 {exercise.restSeconds} 秒 ·{' '}
                    {getExerciseStatusLabel(exercise.status)}
                  </p>
                </Link>

                {currentSession.status === 'pending' && exercise.status === 'pending' ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => void handleDeleteExercise(exercise.id)}
                    className="shrink-0 rounded-full border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 disabled:cursor-not-allowed disabled:text-rose-300"
                  >
                    删除
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {currentSession?.status === 'pending' ? (
          <p className="text-xs text-slate-500">删除入口仅在未开始状态显示，且不会影响模板动作。</p>
        ) : null}
      </SectionCard>

      <SectionCard title="新增本次训练动作">
        {!currentSession ? (
          <p>请先选择模板并创建本次训练，然后再追加只属于本次训练的临时动作。</p>
        ) : null}

        {currentSession ? (
          <form className="space-y-3" onSubmit={handleAddTemporaryExercise}>
            <label className="block space-y-2">
              <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                动作名
              </span>
              <input
                value={newExerciseDraft.name}
                disabled={!canAddTemporaryExercise || isSubmitting}
                onChange={(event) =>
                  setNewExerciseDraft((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="例如：双杠臂屈伸"
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                  disabled={!canAddTemporaryExercise || isSubmitting}
                  onChange={(event) =>
                    setNewExerciseDraft((current) => ({
                      ...current,
                      targetSets: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                  disabled={!canAddTemporaryExercise || isSubmitting}
                  onChange={(event) =>
                    setNewExerciseDraft((current) => ({
                      ...current,
                      restSeconds: event.target.value,
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
              </label>
            </div>

            <button
              type="submit"
              disabled={!canAddTemporaryExercise || isSubmitting}
              className="w-full rounded-full border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
            >
              添加到本次训练
            </button>

            <p className="text-xs text-slate-500">
              临时动作只会写入当前 session，不会新增到模板。
            </p>
          </form>
        ) : null}
      </SectionCard>

      <SectionCard title="相关页面">
        <div className="flex flex-wrap gap-3">
          <Link
            to="/templates"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            查看模板页
          </Link>
          {currentSession ? (
            <Link
              to={`/summary/${currentSession.id}`}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              查看总结页
            </Link>
          ) : null}
        </div>
      </SectionCard>
    </div>
  )
}
