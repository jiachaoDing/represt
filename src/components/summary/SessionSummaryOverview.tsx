import { Link } from 'react-router-dom'

import { SectionCard } from '../ui/SectionCard'
import type { SessionSummaryDetail } from '../../db/sessions'
import { getSessionStatusLabel } from '../../lib/session-display'

type SessionSummaryOverviewProps = {
  detail: SessionSummaryDetail | null
  isLoading: boolean
}

export function SessionSummaryOverview({ detail, isLoading }: SessionSummaryOverviewProps) {
  const completedExerciseCount =
    detail?.exercises.filter((exercise) => exercise.status === 'completed').length ?? 0
  const totalExerciseCount = detail?.exercises.length ?? 0

  return (
    <SectionCard
      title="今日训练"
      action={
        detail ? (
          <span className="rounded border border-slate-300 px-2 py-1 text-xs">
            {getSessionStatusLabel(detail.session.status)}
          </span>
        ) : null
      }
    >
      {isLoading ? <p>正在读取今日训练总结...</p> : null}

      {!isLoading && !detail ? (
        <div className="space-y-2">
          <p>没有找到这次训练。</p>
          <Link to="/" className="inline-flex rounded border border-slate-300 px-3 py-2 text-sm">
            返回训练安排
          </Link>
        </div>
      ) : null}

      {detail ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">训练类型</p>
            <p className="mt-1 font-medium">今日训练</p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">训练日期</p>
            <p className="mt-1 font-medium">{detail.session.sessionDateKey}</p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">状态</p>
            <p className="mt-1 font-medium">{getSessionStatusLabel(detail.session.status)}</p>
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
