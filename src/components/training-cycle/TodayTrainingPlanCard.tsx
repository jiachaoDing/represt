import { Link } from 'react-router-dom'

import { TrainingCycleDots } from './TrainingCycleDots'
import type { TrainingCycle } from '../../models/types'
import type { TemplateColor } from '../../lib/template-color'

type TodayTrainingPlanCardProps = {
  cycle: TrainingCycle | null
  currentIndex: number | null
  didAutoImportToday: boolean
  getTemplateColor: (templateId: string) => TemplateColor | null
  todayTemplateName: string | null
  completedSets: number
  totalSets: number
}

function ProgressRing({ completed, total }: { completed: number; total: number }) {
  const radius = 28
  const stroke = 5
  const normalizedRadius = radius - stroke
  const circumference = normalizedRadius * 2 * Math.PI
  const strokeDashoffset =
    total === 0 ? circumference : circumference - (completed / total) * circumference

  const percentage = total === 0 ? 0 : Math.round((completed / total) * 100)

  return (
    <div className="relative flex items-center justify-center">
      <svg height={radius * 2} width={radius * 2} className="-rotate-90 transform">
        <circle
          stroke="var(--primary-container)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke="var(--primary)"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[12px] font-bold text-[var(--primary)]">{percentage}%</span>
      </div>
    </div>
  )
}

export function TodayTrainingPlanCard({
  cycle,
  currentIndex,
  didAutoImportToday,
  getTemplateColor,
  todayTemplateName,
  completedSets,
  totalSets,
}: TodayTrainingPlanCardProps) {
  const isConfigured = (cycle?.slots.length ?? 0) > 0

  return (
    <section className="mx-4 mb-6 mt-2 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-1.5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] flex items-stretch">
      <Link 
        to="/templates/cycle" 
        className="flex-1 flex flex-col justify-center rounded-[1rem] p-3.5 hover:bg-[var(--on-surface)]/5 active:bg-[var(--on-surface)]/10 transition-colors"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-[0.08em] text-[var(--on-surface-variant)] uppercase">
            今日计划
          </p>
          <h2 className="mt-1.5 text-[18px] font-bold text-[var(--on-surface)] leading-tight">
            {!isConfigured ? '未设置循环日程' : todayTemplateName ? todayTemplateName : '休息日'}
          </h2>
        </div>

        {isConfigured && cycle ? (
          <div className="mt-3">
            <TrainingCycleDots
              slots={cycle.slots}
              currentIndex={currentIndex}
              getTemplateColor={getTemplateColor}
            />
          </div>
        ) : null}
      </Link>
      
      {/* 垂直分割线 */}
      <div className="my-3 w-px bg-[var(--outline-variant)]/30" />
      
      <Link 
        to="/summary" 
        className="flex w-[88px] shrink-0 flex-col items-center justify-center rounded-[1rem] p-2 hover:bg-[var(--on-surface)]/5 active:bg-[var(--on-surface)]/10 transition-colors"
      >
        <ProgressRing completed={completedSets} total={totalSets} />
        <span className="mt-2 text-[12px] font-medium text-[var(--on-surface-variant)]">
          {completedSets} / {totalSets} 组
        </span>
      </Link>
    </section>
  )
}
