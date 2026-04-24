import { Link } from 'react-router-dom'

import { TrainingCycleDots } from './TrainingCycleDots'
import type { TrainingCycle } from '../../models/types'
import type { TemplateColor } from '../../lib/template-color'

type TemplateCyclePreviewCardProps = {
  cycle: TrainingCycle | null
  currentIndex: number | null
  daysUntil: number | null
  getTemplateColor: (templateId: string) => TemplateColor | null
  templateId: string | null
}

function getNextTrainingLabel(daysUntil: number | null) {
  if (daysUntil === null) {
    return '未加入循环'
  }

  if (daysUntil === 0) {
    return '今天'
  }

  return `${daysUntil} 天后`
}

export function TemplateCyclePreviewCard({
  cycle,
  currentIndex,
  daysUntil,
  getTemplateColor,
  templateId,
}: TemplateCyclePreviewCardProps) {
  const isConfigured = (cycle?.slots.length ?? 0) > 0
  const previewTitle = !isConfigured
    ? '还没有设置循环'
    : templateId
      ? getNextTrainingLabel(daysUntil)
      : '已设置循环'

  return (
    <Link
      to="/templates/cycle"
      aria-label={isConfigured ? '编辑循环日程' : '设置循环日程'}
      className="mx-4 mt-4 block rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] p-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] transition-colors hover:bg-[var(--surface-container)]/35"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[12px] text-[var(--on-surface-variant)]">下次训练</p>
          <p className="mt-1 text-[17px] font-semibold text-[var(--on-surface)]">
            {previewTitle}
          </p>
          {!isConfigured ? (
            <p className="mt-2 text-sm text-[var(--on-surface-variant)]">
              设置好后，训练页会按当天循环自动加入模板。
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-4">
        {isConfigured && cycle ? (
          <TrainingCycleDots
            slots={cycle.slots}
            currentIndex={currentIndex}
            getTemplateColor={getTemplateColor}
            highlightedTemplateId={templateId ?? null}
          />
        ) : (
          <div />
        )}

        <div className="text-right text-[12px] text-[var(--on-surface-variant)]">
          <p>{isConfigured ? '循环预览' : '循环日程'}</p>
          <p className="mt-1">
            {isConfigured && cycle ? `${cycle.slots.length} 天` : '未初始化'}
          </p>
        </div>
      </div>
    </Link>
  )
}
