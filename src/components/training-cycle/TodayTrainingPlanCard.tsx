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
}

export function TodayTrainingPlanCard({
  cycle,
  currentIndex,
  didAutoImportToday,
  getTemplateColor,
  todayTemplateName,
}: TodayTrainingPlanCardProps) {
  const isConfigured = (cycle?.slots.length ?? 0) > 0

  return (
    <section className="mx-4 mb-6 mt-2 rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] font-medium tracking-[0.08em] text-[var(--on-surface-variant)]">
            今日计划
          </p>
          <h2 className="mt-2 text-[18px] font-bold text-[var(--on-surface)]">
            {!isConfigured ? '还没有设置循环日程' : todayTemplateName ? todayTemplateName : '休息日'}
          </h2>
          <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
            {!isConfigured
              ? '你仍然可以像现在一样手动把模板加入今日训练。'
              : todayTemplateName
                ? didAutoImportToday
                  ? '已按循环自动加入今日训练。'
                  : '今天命中了训练模板。'
                : '今天没有默认模板，仍可临时开始训练。'}
          </p>
        </div>

        <Link
          to="/templates/cycle"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl border border-[var(--outline-variant)] px-4 text-sm font-medium text-[var(--on-surface)]"
        >
          日程
        </Link>
      </div>

      {isConfigured && cycle ? (
        <div className="mt-4">
          <TrainingCycleDots
            slots={cycle.slots}
            currentIndex={currentIndex}
            getTemplateColor={getTemplateColor}
          />
        </div>
      ) : null}
    </section>
  )
}
