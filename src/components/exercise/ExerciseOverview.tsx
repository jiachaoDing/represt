import { SectionCard } from '../ui/SectionCard'
import type { SessionExerciseDetail } from '../../db/sessions'
import {
  getCurrentSetDurationLabel,
  getExerciseRestLabel,
  getExerciseStatusLabel,
} from '../../lib/session-display'

type ExerciseOverviewProps = {
  canCompleteSet: boolean
  detail: SessionExerciseDetail | null
  isLoading: boolean
  now: number
  timingStartedAt: string | null
  onCompleteSet: () => Promise<void>
}

export function ExerciseOverview({
  canCompleteSet,
  detail,
  isLoading,
  now,
  timingStartedAt,
  onCompleteSet,
}: ExerciseOverviewProps) {
  return (
    <SectionCard
      title="动作执行"
      action={
        detail ? (
          <span className="rounded border border-slate-300 px-2 py-1 text-xs">
            {getExerciseStatusLabel(detail.exercise.status)}
          </span>
        ) : null
      }
    >
      {isLoading ? <p>正在读取动作数据...</p> : null}
      {!isLoading && !detail ? <p>这个动作不存在，可能已经被删除。</p> : null}

      {detail ? (
        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-lg font-medium">{detail.exercise.name}</p>
            <p className="text-sm text-slate-500">
              {detail.exercise.completedSets} / {detail.exercise.targetSets} 组 · 休息 {detail.exercise.restSeconds} 秒
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500">当前组计时</p>
              <p className="mt-1 font-medium">
                {getCurrentSetDurationLabel(timingStartedAt, now)}
              </p>
            </div>
            <div className="rounded border border-slate-200 p-3">
              <p className="text-xs text-slate-500">休息状态</p>
              <p className="mt-1 font-medium">{getExerciseRestLabel(detail.exercise, now)}</p>
            </div>
          </div>

          <p className="text-sm text-slate-500">所属训练：{detail.session.templateName ?? '临时训练'}</p>

          <button
            type="button"
            disabled={!canCompleteSet}
            onClick={() => void onCompleteSet()}
            className="rounded border border-slate-900 bg-slate-900 px-3 py-2 text-sm text-white disabled:border-slate-300 disabled:bg-slate-300"
          >
            {detail.exercise.status === 'completed' ? '动作已完成' : '完成本组'}
          </button>
        </div>
      ) : null}
    </SectionCard>
  )
}
