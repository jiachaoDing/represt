import { useTranslation } from 'react-i18next'

import type { TemplateWithExercises } from '../../db/templates'
import { getTemplateColor } from '../../lib/template-color'

type TemplateSwitcherProps = {
  isSubmitting: boolean
  selectedTemplateId: string | null
  templates: TemplateWithExercises[]
  onCreate: () => void
  onSelect: (templateId: string) => void
}

export function TemplateSwitcher({
  isSubmitting,
  selectedTemplateId,
  templates,
  onCreate,
  onSelect,
}: TemplateSwitcherProps) {
  const { t } = useTranslation()

  return (
    <div
      className="-mx-4 mt-2 overflow-x-auto px-4 scrollbar-hide"
      data-primary-tab-swipe-lock="true"
    >
      <div className="flex w-max items-center gap-2 pb-2">
        <button
          type="button"
          onClick={onCreate}
          disabled={isSubmitting}
          className="flex h-8 items-center justify-center rounded-lg border border-[var(--outline-variant)] px-3 text-[var(--primary)] transition-colors whitespace-nowrap tap-highlight-transparent hover:bg-[var(--primary)]/10"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mr-1"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {t('common.add')}
        </button>
        {templates.map((template, index) => {
          const isSelected = template.id === selectedTemplateId
          const color = getTemplateColor(index)
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelect(template.id)}
              disabled={isSubmitting}
              className={[
                'flex h-8 items-center justify-center rounded-lg px-4 text-sm font-medium whitespace-nowrap transition-colors tap-highlight-transparent',
                isSelected ? 'border-2' : 'border',
                isSelected ? '' : 'hover:opacity-90',
              ].join(' ')}
              style={{
                backgroundColor: isSelected
                  ? `color-mix(in srgb, ${color.soft} 78%, transparent)`
                  : `color-mix(in srgb, ${color.soft} 36%, transparent)`,
                borderColor: isSelected
                  ? color.solid
                  : `color-mix(in srgb, ${color.solid} 46%, transparent)`,
                color: isSelected ? color.text : color.solid,
              }}
            >
              {template.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}
