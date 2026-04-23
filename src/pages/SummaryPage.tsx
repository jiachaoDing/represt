import { Link, useParams } from 'react-router-dom'

import { SectionCard } from '../components/SectionCard'

const completedExercisePreview = [
  { name: '卧推', sets: '5 / 5 组' },
  { name: '杠铃划船', sets: '4 / 4 组' },
]

export function SummaryPage() {
  const { sessionId = 'unknown-session' } = useParams()

  return (
    <div className="space-y-4">
      <SectionCard title="本次训练总结">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <p className="text-xs text-slate-500">会话 ID</p>
            <p className="mt-1 truncate font-medium text-slate-900">{sessionId}</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <p className="text-xs text-slate-500">总时长</p>
            <p className="mt-1 font-medium text-slate-900">48 分钟</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <p className="text-xs text-slate-500">完成动作</p>
            <p className="mt-1 font-medium text-slate-900">2 / 2</p>
          </div>
        </div>
        <p>后续将在这里展示本次训练的动作汇总、每组记录与训练结果概览。</p>
      </SectionCard>

      <SectionCard title="动作汇总占位">
        <div className="space-y-3">
          {completedExercisePreview.map((exercise) => (
            <div
              key={exercise.name}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-600"
            >
              <p className="font-medium text-slate-900">{exercise.name}</p>
              <p className="mt-1">{exercise.sets}</p>
            </div>
          ))}
        </div>
        <Link
          to="/"
          className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
        >
          返回训练安排
        </Link>
      </SectionCard>
    </div>
  )
}
