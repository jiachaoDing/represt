import { useTranslation } from 'react-i18next'

import { BottomSheet } from '../ui/BottomSheet'
import type { TemplateWithExercises } from '../../db/templates'

type ScheduleActionSheetProps = {
  hasTemplates: boolean
  isOpen: boolean
  templates: TemplateWithExercises[]
  onClose: () => void
  onCreateExercise: () => void
  onSelectTemplate: (templateId: string) => void
}

export function ScheduleActionSheet({
  hasTemplates,
  isOpen,
  templates,
  onClose,
  onCreateExercise,
  onSelectTemplate,
}: ScheduleActionSheetProps) {
  const { t } = useTranslation()

  return (
    <BottomSheet open={isOpen} title={t('schedule.addExercise')} onClose={onClose}>
      <div className="space-y-1">
        {hasTemplates
          ? templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => onSelectTemplate(template.id)}
                className="flex w-full items-center justify-between rounded-xl px-4 py-4 text-left transition-colors hover:bg-[var(--surface-container)]"
              >
                <span className="text-base font-medium text-[var(--on-surface)]">
                  {t('schedule.importTemplate', { name: template.name })}
                </span>
                <span className="text-sm text-[var(--on-surface-variant)]">
                  {t('summary.exerciseCount', { count: template.exercises.length })}
                </span>
              </button>
            ))
          : null}
        {hasTemplates ? <div className="my-2 border-t border-[var(--outline-variant)]" /> : null}
        <button
          type="button"
          onClick={onCreateExercise}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-left transition-colors hover:bg-[var(--surface-container)]"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-[var(--on-surface)]"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span className="text-base font-medium text-[var(--on-surface)]">{t('schedule.manualNewExercise')}</span>
        </button>
      </div>
    </BottomSheet>
  )
}
