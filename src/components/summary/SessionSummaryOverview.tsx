import { Link } from 'react-router-dom'

import { SectionCard } from '../ui/SectionCard'
import type { SessionSummaryDetail } from '../../db/sessions'
import { formatDuration } from '../../lib/rest-timer'
import { getSessionDurationSeconds, getSessionStatusLabel } from '../../lib/session-display'

type SessionSummaryOverviewProps = {
  detail: SessionSummaryDetail | null
  isLoading: boolean
  now: number
}

export function SessionSummaryOverview({
  detail,
  isLoading,
  now,
}: SessionSummaryOverviewProps) {
  const completedExerciseCount =
    detail?.exercises.filter((exercise) => exercise.status === 'completed').length ?? 0
  const totalExerciseCount = detail?.exercises.length ?? 0
  const durationSeconds = detail
    ? getSessionDurationSeconds(detail.session.startedAt, detail.session.endedAt, now)
    : null

  return (
    <SectionCard
      title="本次训练"
      action={
        detail ? (
          <span className="rounded border border-slate-300 px-2 py-1 text-xs">
            {getSessionStatusLabel(detail.session.status)}
          </span>
        ) : null
      }
    >
      {isLoading ? <p>正在读取训练总结...</p> : null}

      {!isLoading && !detail ? (
        <div className="space-y-2">
          <p>没有找到这次训练。</p>
          <Link to="/" className="inline-flex rounded border border-slate-300 px-3 py-2 text-sm">
            返回训练安排
          </Link>
        </div>
      ) : null}

      {detail ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">训练名称</p>
            <p className="mt-1 font-medium">{detail.session.templateName ?? '临时训练'}</p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">总时长</p>
            <p className="mt-1 font-medium">
              {durationSeconds === null ? '未开始' : formatDuration(durationSeconds)}
            </p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">完成动作</p>
            <p className="mt-1 font-medium">
              {completedExerciseCount} / {totalExerciseCount}
            </p>
          </div>
        </div>
      ) : null}
    </SectionCard>
  )
}
