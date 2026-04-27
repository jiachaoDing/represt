import { useTranslation } from 'react-i18next'

import { BottomSheet } from '../ui/BottomSheet'
import type { TemplateWithExercises } from '../../db/templates'
import { getTemplateColor, type TemplateColor } from '../../lib/template-color'
import { DeleteIcon, OptionIcon, RestIcon, TemplateIcon } from './TrainingCycleOptionIcon'

type TrainingCycleSlotSheetProps = {
  isSubmitting: boolean
  onAssignTemplate: (templateId: string | null) => void
  onClose: () => void
  onDeleteSlot: (slotId: string | null) => void
  open: boolean
  selectedIndex: number
  selectedSlotId: string | null
  selectedTemplate: TemplateWithExercises | null
  templateColorMap: Map<string, TemplateColor>
  templates: TemplateWithExercises[]
}

export function TrainingCycleSlotSheet({
  isSubmitting,
  onAssignTemplate,
  onClose,
  onDeleteSlot,
  open,
  selectedIndex,
  selectedSlotId,
  selectedTemplate,
  templateColorMap,
  templates,
}: TrainingCycleSlotSheetProps) {
  const { t } = useTranslation()

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t('trainingCycle.dayNumber', { dayNumber: selectedIndex + 1 })}
      description={
        selectedTemplate
          ? t('trainingCycle.currentSelection', { name: selectedTemplate.name })
          : t('trainingCycle.currentRestDay')
      }
    >
      <div className="grid gap-1">
        <button
          type="button"
          onClick={() => {
            onAssignTemplate(null)
            onClose()
          }}
          disabled={isSubmitting}
          className={[
            'flex items-center justify-between rounded-[1rem] px-4 py-3 text-left transition-colors active:scale-[0.98]',
            selectedTemplate === null
              ? 'bg-[var(--surface-variant)] text-[var(--on-surface-variant)]'
              : 'bg-transparent text-[var(--on-surface)]',
          ].join(' ')}
        >
          <div className="flex items-center gap-3">
            <OptionIcon className="bg-[var(--surface-container)] text-[var(--on-surface-variant)]">
              <RestIcon />
            </OptionIcon>
            <span className="font-semibold">{t('trainingCycle.restDay')}</span>
          </div>
          {selectedTemplate === null && (
            <svg className="h-5 w-5 text-[var(--primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {templates.map((template) => {
          const color = templateColorMap.get(template.id) ?? getTemplateColor(0)
          const isActive = selectedTemplate?.id === template.id

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => {
                onAssignTemplate(template.id)
                onClose()
              }}
              disabled={isSubmitting}
              className={[
                'flex items-center justify-between rounded-[1rem] px-4 py-3 text-left transition-colors active:scale-[0.98]',
                isActive
                  ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                  : 'bg-transparent text-[var(--on-surface)]',
              ].join(' ')}
            >
              <div className="flex items-center gap-3">
                <OptionIcon
                  className="shadow-sm"
                  style={{ backgroundColor: color.soft, color: color.solid }}
                >
                  <TemplateIcon />
                </OptionIcon>
                <div>
                  <div className="font-semibold">{template.name}</div>
                  <div className="text-[13px] font-medium opacity-70 mt-0.5">
                    {t('trainingCycle.exerciseCount', { count: template.exercises.length })}
                  </div>
                </div>
              </div>
              {isActive && (
                <svg className="h-5 w-5" style={{ color: color.solid }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )
        })}

        <div className="my-3 h-px bg-[var(--outline-variant)]/20" />

        <button
          type="button"
          onClick={() => {
            onDeleteSlot(selectedSlotId)
            onClose()
          }}
          disabled={isSubmitting}
          className="flex items-center gap-3 rounded-[1rem] px-4 py-3.5 text-left text-[var(--error)] hover:bg-[var(--error-container)] transition-colors active:scale-[0.98]"
        >
          <OptionIcon className="bg-[var(--error-container)] text-[var(--error)]">
            <DeleteIcon />
          </OptionIcon>
          <span className="font-medium">{t('trainingCycle.deleteDay')}</span>
        </button>
      </div>
    </BottomSheet>
  )
}
