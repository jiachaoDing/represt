import { useId, type ComponentProps, type FormEvent } from 'react'
import { ChevronRight, ClipboardPaste, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimatedDialog } from '../motion/AnimatedDialog'
import { SharedPlanImportForm } from './SharedPlanImportSheet'

type PlanSheetMode = 'create' | 'rename' | null

type PlanNameSheetProps = {
  createName: string
  isOpen: boolean
  isSubmitting: boolean
  mode: PlanSheetMode
  renameName: string
  onClose: () => void
  onAiImport?: () => void
  onImported?: ComponentProps<typeof SharedPlanImportForm>['onImported']
  onCreateNameChange: (value: string) => void
  onRenameNameChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function PlanNameSheet({
  createName,
  isOpen,
  isSubmitting,
  mode,
  renameName,
  onClose,
  onAiImport,
  onImported,
  onCreateNameChange,
  onRenameNameChange,
  onSubmit,
}: PlanNameSheetProps) {
  const { t } = useTranslation()
  const titleId = useId()
  const value = mode === 'create' ? createName : renameName

  return (
    <AnimatedDialog
      open={isOpen}
      onClose={onClose}
      position="upper"
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="space-y-5 rounded-[28px] bg-[var(--surface-container)] p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 id={titleId} className="text-xl text-[var(--on-surface)]">
            {mode === 'create' ? t('plans.newPlan') : t('plans.editName')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--on-surface-variant)] hover:bg-[var(--on-surface)]/10"
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <form className="space-y-5" onSubmit={onSubmit}>
          <label className="block">
            <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">
              {t('plans.planName')}
            </span>
            <input
              value={value}
              disabled={isSubmitting}
              onChange={(event) =>
                mode === 'create'
                  ? onCreateNameChange(event.target.value)
                  : onRenameNameChange(event.target.value)
              }
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-[var(--surface-container)] px-4 py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
              placeholder={t('plans.planPlaceholder')}
            />
          </label>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !value.trim()}
              className="w-full rounded-full bg-[var(--primary)] px-6 py-3.5 text-sm font-medium text-[var(--on-primary)] transition-opacity disabled:opacity-40"
            >
              {mode === 'create' ? t('plans.createPlan') : t('common.save')}
            </button>
          </div>
        </form>

        {mode === 'create' ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="h-px flex-1 bg-[var(--outline-variant)]" />
              <span className="text-xs font-medium text-[var(--on-surface-variant)]">
                {t('plans.createOrImport')}
              </span>
              <span className="h-px flex-1 bg-[var(--outline-variant)]" />
            </div>
            <SharedPlanImportForm onImported={onImported} />
            {onAiImport ? (
              <button
                type="button"
                onClick={onAiImport}
                disabled={isSubmitting}
                className="flex min-h-14 w-full items-center gap-3 rounded-xl bg-[var(--surface)] px-4 text-left text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)] disabled:opacity-50"
              >
                <ClipboardPaste size={18} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{t('plans.aiImport.title')}</span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
                    {t('plans.aiImport.entryDescription')}
                  </span>
                </span>
                <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </AnimatedDialog>
  )
}
