import { useState } from 'react'
import { ChevronRight, KeyRound, List } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { notifyPlansChanged } from '../../lib/plan-change-events'
import { AnimatedSheet } from '../motion/AnimatedSheet'
import { SharedPlanImportSheet } from './SharedPlanImportSheet'
import { SharedPlanRecordsSheet } from './SharedPlanRecordsSheet'

type PlanShareManageSheetProps = {
  open: boolean
  onClose: () => void
}

export function PlanShareManageSheet({ open, onClose }: PlanShareManageSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isRecordsOpen, setIsRecordsOpen] = useState(false)

  return (
    <>
      <AnimatedSheet open={open} onClose={onClose} title={t('planShare.manageTitle')}>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[var(--surface)] px-4 text-left text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
          >
            <KeyRound size={18} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{t('planShare.importMenuItem')}</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
                {t('planShare.importDescription')}
              </span>
            </span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => setIsRecordsOpen(true)}
            className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[var(--surface)] px-4 text-left text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
          >
            <List size={18} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{t('planShare.records.menuItem')}</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
                {t('planShare.records.description')}
              </span>
            </span>
            <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
          </button>
        </div>
      </AnimatedSheet>

      <SharedPlanImportSheet
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={(plans) => {
          const selectedPlanId = plans[0]?.id ?? null
          notifyPlansChanged(selectedPlanId)
          setIsImportOpen(false)
          onClose()
          navigate('/plans', { state: selectedPlanId ? { selectedPlanId } : undefined })
        }}
      />

      <SharedPlanRecordsSheet
        open={isRecordsOpen}
        onClose={() => setIsRecordsOpen(false)}
      />
    </>
  )
}
