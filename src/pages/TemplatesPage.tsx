import { Link } from 'react-router-dom'

import { SectionCard } from '../components/SectionCard'

const templatePreview = [
  { name: '上肢力量 A', exercises: 4 },
  { name: '下肢力量 B', exercises: 5 },
]

export function TemplatesPage() {
  return (
    <div className="space-y-4">
      <SectionCard title="模板列表">
        <div className="space-y-3">
          {templatePreview.map((template) => (
            <div
              key={template.name}
              className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
            >
              <div>
                <p className="font-medium text-slate-900">{template.name}</p>
                <p className="text-xs text-slate-500">{template.exercises} 个动作占位</p>
              </div>
              <span className="text-sm text-slate-400">待编辑</span>
            </div>
          ))}
        </div>
        <p>后续将在这里实现长期模板的新增、重命名、删除，以及模板动作维护。</p>
      </SectionCard>

      <SectionCard title="模板编辑范围">
        <ul className="space-y-2">
          <li>这里只维护长期模板，不直接影响已开始的本次训练。</li>
          <li>后续会加入模板动作的默认组数与默认间歇时长编辑。</li>
          <li>当前页面仅保留最小布局与导航壳子。</li>
        </ul>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            disabled
            className="rounded-full bg-slate-300 px-4 py-2 text-sm font-medium text-slate-600"
          >
            新建模板（待实现）
          </button>
          <Link
            to="/"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
          >
            返回训练安排
          </Link>
        </div>
      </SectionCard>
    </div>
  )
}
