import { Link } from 'react-router-dom'

import { SectionCard } from '../components/SectionCard'
import { db } from '../db/app-db'
import { useNow } from '../hooks/useNow'
import { getRestTimerSnapshot } from '../lib/rest-timer'
import type { RestTimerState } from '../models/types'

const previewTimer: RestTimerState = {
  sessionExerciseId: 'demo-bench-press',
  status: 'running',
  startedAt: new Date(Date.now() - 20_000).toISOString(),
  endsAt: new Date(Date.now() + 70_000).toISOString(),
}

const exercisePreview = [
  { id: 'bench-press', name: '卧推', progress: '0 / 5 组', status: '未开始' },
  { id: 'barbell-row', name: '杠铃划船', progress: '2 / 4 组', status: '进行中' },
]

export function SchedulePage() {
  const now = useNow()
  const timer = getRestTimerSnapshot(previewTimer, now)

  return (
    <div className="space-y-4">
      <SectionCard
        title="本次训练"
        action={
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
            Dexie 已就绪
          </span>
        }
      >
        <p>当前阶段先提供训练安排页壳子、页面路由、离线基础能力和本地数据层骨架。</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-slate-100 p-3">
            <p className="text-xs text-slate-500">当前模板</p>
            <p className="mt-1 font-medium text-slate-900">上肢力量 A</p>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <p className="text-xs text-slate-500">训练状态</p>
            <p className="mt-1 font-medium text-slate-900">未开始</p>
          </div>
        </div>
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">倒计时占位</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{timer.label}</p>
          <p className="mt-1 text-xs text-slate-500">后续将基于结束时间戳持续计算，切页后继续运行。</p>
        </div>
      </SectionCard>

      <SectionCard title="动作列表占位">
        <div className="space-y-3">
          {exercisePreview.map((exercise) => (
            <Link
              key={exercise.id}
              to={`/exercise/${exercise.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
            >
              <div>
                <p className="font-medium text-slate-900">{exercise.name}</p>
                <p className="text-xs text-slate-500">
                  {exercise.progress} · {exercise.status}
                </p>
              </div>
              <span className="text-sm text-slate-400">进入</span>
            </Link>
          ))}
        </div>
        <p>后续将在这里实现模板切换、本次训练动作列表、训练中新增动作与删除未开始动作。</p>
      </SectionCard>

      <SectionCard title="脚手架状态">
        <ul className="space-y-2">
          <li>本地数据库名：`{db.name}`</li>
          <li>PWA 已启用 manifest 与开发环境 Service Worker。</li>
          <li>路由已覆盖训练安排、动作页、模板编辑页和训练总结页。</li>
        </ul>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link
            to="/templates"
            className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          >
            查看模板页
          </Link>
          <Link
            to="/summary/demo-session"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            查看总结页
          </Link>
        </div>
      </SectionCard>
    </div>
  )
}
