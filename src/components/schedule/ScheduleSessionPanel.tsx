import { Link } from 'react-router-dom'

import { SectionCard } from '../ui/SectionCard'
import type { WorkoutSessionWithExercises } from '../../db/sessions'
import type { TemplateWithExercises } from '../../db/templates'
import { getSessionStatusLabel } from '../../lib/session-display'

type ScheduleSessionPanelProps = {
  canChangeTemplate: boolean
  currentSession: WorkoutSessionWithExercises | null
  currentTemplate: TemplateWithExercises | null
  hasTemplates: boolean
  isLoading: boolean
  isSubmitting: boolean
  needsRebuild: boolean
  selectedTemplateId: string | null
  sessionActionLabel: string
  setSelectedTemplateId: (value: string | null) => void
  templates: TemplateWithExercises[]
  onCreateOrRebuildSession: () => Promise<void>
}

export function ScheduleSessionPanel({
  canChangeTemplate,
  currentSession,
  currentTemplate,
  hasTemplates,
  isLoading,
  isSubmitting,
  needsRebuild,
  selectedTemplateId,
  sessionActionLabel,
  setSelectedTemplateId,
  templates,
  onCreateOrRebuildSession,
}: ScheduleSessionPanelProps) {
  return (
    <SectionCard
      title="本次训练"
      action={
        currentSession ? (
          <span className="rounded border border-slate-300 px-2 py-1 text-xs">
            {getSessionStatusLabel(currentSession.status)}
          </span>
        ) : null
      }
    >
      {isLoading ? <p>正在读取训练数据...</p> : null}

      {!isLoading && !hasTemplates ? (
        <div className="space-y-2">
          <p>当前没有模板，请先创建模板。</p>
          <Link
            to="/templates"
            className="inline-flex rounded border border-slate-900 px-3 py-2 text-sm"
          >
            去模板页
          </Link>
        </div>
      ) : null}

      {!isLoading && hasTemplates ? (
        <div className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-slate-500">训练模板</span>
            <select
              value={selectedTemplateId ?? ''}
              disabled={!canChangeTemplate || isSubmitting}
              onChange={(event) => setSelectedTemplateId(event.target.value || null)}
              className="w-full rounded border border-slate-300 px-3 py-2"
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1 text-sm">
            <p>当前模板：{currentSession?.templateName ?? '未创建'}</p>
            <p>模板动作：{currentTemplate?.exercises.length ?? 0} 个</p>
          </div>

          {needsRebuild ? <p>切换后会按新模板重建当前未开始训练。</p> : null}
          {!canChangeTemplate && currentSession ? <p>训练已开始，模板已锁定。</p> : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!selectedTemplateId || !canChangeTemplate || isSubmitting}
              onClick={() => void onCreateOrRebuildSession()}
              className="rounded border border-slate-900 bg-slate-900 px-3 py-2 text-sm text-white disabled:border-slate-300 disabled:bg-slate-300"
            >
              {sessionActionLabel}
            </button>
            {currentSession ? (
              <Link
                to={`/summary/${currentSession.id}`}
                className="rounded border border-slate-300 px-3 py-2 text-sm"
              >
                查看总结
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </SectionCard>
  )
}
