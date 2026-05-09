import { useState, type ReactNode } from 'react'
import {
  Check,
  ChevronRight,
  ClipboardPaste,
  Code2,
  Copy,
  KeyRound,
  List,
  RotateCcw,
  Share2,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { notifyPlansChanged } from '../../lib/plan-change-events'
import {
  buildPlanTemplateExport,
  buildTrainingCycleExport,
  listPlanTemplateExportOptions,
  type PlanTemplateExportOption,
  type PlanTransferData,
} from '../../lib/plan-transfer'
import { getPlanTransferShareTitle } from '../../lib/plan-share-text'
import { triggerHaptic } from '../../lib/haptics'
import { AnimatedSheet } from '../motion/AnimatedSheet'
import { PlanJsonImportSheet } from './PlanJsonImportSheet'
import { PlanShareSheet } from './PlanShareSheet'
import { SharedPlanImportSheet } from './SharedPlanImportSheet'
import { SharedPlanRecordsSheet } from './SharedPlanRecordsSheet'

type PlanShareManageSheetProps = {
  open: boolean
  onClose: () => void
}

type SheetMode = 'main' | 'plan-share-select' | 'json-main' | 'json-plan-select' | 'json-export'

type JsonExportDraft = {
  data: PlanTransferData
  title: string
}

function formatJson(data: unknown) {
  return JSON.stringify(data, null, 2)
}

function MenuButton({
  children,
  icon: Icon,
  onClick,
}: {
  children: ReactNode
  icon: LucideIcon
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[var(--surface)] px-4 text-left text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)]"
    >
      <Icon size={18} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden="true" />
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
    </button>
  )
}

export function PlanShareManageSheet({ open, onClose }: PlanShareManageSheetProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [mode, setMode] = useState<SheetMode>('main')
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [isJsonImportOpen, setIsJsonImportOpen] = useState(false)
  const [isRecordsOpen, setIsRecordsOpen] = useState(false)
  const [isCycleShareOpen, setIsCycleShareOpen] = useState(false)
  const [sharePlanIds, setSharePlanIds] = useState<string[] | null>(null)
  const [planOptions, setPlanOptions] = useState<PlanTemplateExportOption[]>([])
  const [selectedPlanIds, setSelectedPlanIds] = useState<string[]>([])
  const [jsonDraft, setJsonDraft] = useState<JsonExportDraft | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  function resetFeedback() {
    setMessage(null)
    setError(null)
  }

  function resetFlow() {
    setMode('main')
    setPlanOptions([])
    setSelectedPlanIds([])
    setJsonDraft(null)
    resetFeedback()
  }

  async function openPlanSelection(nextMode: Extract<SheetMode, 'plan-share-select' | 'json-plan-select'>) {
    try {
      setIsBusy(true)
      resetFeedback()
      const options = await listPlanTemplateExportOptions()
      if (options.length === 0) {
        setError(t('settings.planTransfer.errors.noPlans'))
        void triggerHaptic('error')
        return
      }
      setPlanOptions(options)
      setSelectedPlanIds([])
      setMode(nextMode)
    } catch (loadError) {
      console.error(loadError)
      setError(t('settings.planTransfer.errors.exportFailed'))
      void triggerHaptic('error')
    } finally {
      setIsBusy(false)
    }
  }

  function togglePlanSelection(planId: string) {
    setSelectedPlanIds((current) =>
      current.includes(planId) ? current.filter((id) => id !== planId) : [...current, planId],
    )
  }

  async function prepareJsonPlanExport() {
    try {
      setIsBusy(true)
      resetFeedback()
      const data = await buildPlanTemplateExport(selectedPlanIds)
      if (!data) {
        setError(t('settings.planTransfer.errors.exportFailed'))
        void triggerHaptic('error')
        return
      }
      setJsonDraft({ data, title: getPlanTransferShareTitle(t, data) })
      setMode('json-export')
    } catch (exportError) {
      console.error(exportError)
      setError(t('settings.planTransfer.errors.exportFailed'))
      void triggerHaptic('error')
    } finally {
      setIsBusy(false)
    }
  }

  async function prepareJsonCycleExport() {
    try {
      setIsBusy(true)
      resetFeedback()
      const data = await buildTrainingCycleExport()
      if (data.cycle.length === 0 || data.plans.length === 0) {
        setError(t('settings.planTransfer.errors.emptyCycle'))
        void triggerHaptic('error')
        return
      }
      setJsonDraft({ data, title: getPlanTransferShareTitle(t, data, 'training-cycle') })
      setMode('json-export')
    } catch (exportError) {
      console.error(exportError)
      setError(t('settings.planTransfer.errors.exportFailed'))
      void triggerHaptic('error')
    } finally {
      setIsBusy(false)
    }
  }

  async function copyJsonDraft() {
    if (!jsonDraft) {
      return
    }

    try {
      resetFeedback()
      await navigator.clipboard.writeText(formatJson(jsonDraft.data))
      setMessage(t('settings.planTransfer.copiedJson'))
      void triggerHaptic('success')
    } catch (copyError) {
      console.error(copyError)
      setError(t('settings.planTransfer.errors.copyFailed'))
      void triggerHaptic('error')
    }
  }

  const isPlanSelectionMode = mode === 'plan-share-select' || mode === 'json-plan-select'

  return (
    <>
      <AnimatedSheet
        open={open}
        onClose={() => {
          onClose()
          resetFlow()
        }}
        title={t('planShare.manageTitle')}
      >
        {mode === 'main' ? (
          <div className="space-y-2">
            <MenuButton icon={KeyRound} onClick={() => setIsImportOpen(true)}>
              <span className="block truncate">{t('planShare.importMenuItem')}</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
                {t('planShare.importDescription')}
              </span>
            </MenuButton>
            <MenuButton icon={Share2} onClick={() => void openPlanSelection('plan-share-select')}>
              <span className="block truncate">{t('planShare.exportPlansMenuItem')}</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
                {t('planShare.exportPlansDescription')}
              </span>
            </MenuButton>
            <MenuButton icon={RotateCcw} onClick={() => setIsCycleShareOpen(true)}>
              <span className="block truncate">{t('planShare.exportCycleMenuItem')}</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
                {t('planShare.exportCycleDescription')}
              </span>
            </MenuButton>
            <MenuButton icon={List} onClick={() => setIsRecordsOpen(true)}>
              <span className="block truncate">{t('planShare.records.menuItem')}</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
                {t('planShare.records.description')}
              </span>
            </MenuButton>
            <MenuButton icon={Code2} onClick={() => setMode('json-main')}>
              <span className="block truncate">{t('settings.planTransfer.jsonBackup')}</span>
              <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">
                {t('settings.planTransfer.jsonBackupDescription')}
              </span>
            </MenuButton>
          </div>
        ) : null}

        {isPlanSelectionMode ? (
          <div className="space-y-2">
            <p className="px-1 text-sm font-semibold text-[var(--on-surface)]">
              {t('settings.planTransfer.selectPlanTitle')}
            </p>
            <div className="flex items-center justify-between gap-2 px-1">
              <span className="text-xs font-medium text-[var(--on-surface-variant)]">
                {t('settings.planTransfer.selectedCount', { count: selectedPlanIds.length })}
              </span>
              <button
                type="button"
                onClick={() =>
                  setSelectedPlanIds(
                    selectedPlanIds.length === planOptions.length ? [] : planOptions.map((plan) => plan.id),
                  )
                }
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--primary)]"
              >
                {selectedPlanIds.length === planOptions.length ? t('plans.clearAll') : t('plans.selectAll')}
              </button>
            </div>
            {planOptions.map((plan) => (
              <button
                key={plan.id}
                type="button"
                aria-pressed={selectedPlanIds.includes(plan.id)}
                onClick={() => togglePlanSelection(plan.id)}
                disabled={isBusy}
                className={[
                  'flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-4 text-left text-sm font-medium transition-colors disabled:opacity-50',
                  selectedPlanIds.includes(plan.id)
                    ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                    : 'bg-[var(--surface)] text-[var(--on-surface)] hover:bg-[var(--surface-container)]',
                ].join(' ')}
              >
                <span className="flex min-w-0 flex-1 items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--outline-variant)]">
                    {selectedPlanIds.includes(plan.id) ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate">{plan.name}</span>
                </span>
                <span className="shrink-0 text-xs text-[var(--on-surface-variant)]">
                  {t('summary.exerciseCount', { count: plan.exerciseCount })}
                </span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                if (mode === 'plan-share-select') {
                  setSharePlanIds(selectedPlanIds)
                  return
                }
                void prepareJsonPlanExport()
              }}
              disabled={isBusy || selectedPlanIds.length === 0}
              className="mt-2 min-h-12 w-full rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--on-primary)] disabled:opacity-50"
            >
              {mode === 'plan-share-select' ? t('planShare.create') : t('settings.planTransfer.copyJson')}
            </button>
            <button
              type="button"
              onClick={() => setMode(mode === 'plan-share-select' ? 'main' : 'json-main')}
              className="min-h-10 rounded-full px-4 text-sm font-medium text-[var(--primary)]"
            >
              {t('common.back')}
            </button>
          </div>
        ) : null}

        {mode === 'json-main' ? (
          <div className="space-y-2">
            <MenuButton icon={ClipboardPaste} onClick={() => setIsJsonImportOpen(true)}>
              <span className="block truncate">{t('settings.planTransfer.pasteJson')}</span>
            </MenuButton>
            <MenuButton icon={Copy} onClick={() => void openPlanSelection('json-plan-select')}>
              <span className="block truncate">{t('settings.planTransfer.exportPlansJson')}</span>
            </MenuButton>
            <MenuButton icon={RotateCcw} onClick={() => void prepareJsonCycleExport()}>
              <span className="block truncate">{t('settings.planTransfer.exportCycleJson')}</span>
            </MenuButton>
            <button
              type="button"
              onClick={() => setMode('main')}
              className="min-h-10 rounded-full px-4 text-sm font-medium text-[var(--primary)]"
            >
              {t('common.back')}
            </button>
          </div>
        ) : null}

        {mode === 'json-export' && jsonDraft ? (
          <div className="space-y-2">
            <p className="px-1 text-sm font-semibold text-[var(--on-surface)]">{jsonDraft.title}</p>
            <div className="rounded-xl bg-[var(--surface)] p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="px-1 text-xs font-medium text-[var(--on-surface-variant)]">
                  {t('settings.planTransfer.jsonContent')}
                </span>
                <button
                  type="button"
                  onClick={() => void copyJsonDraft()}
                  disabled={isBusy}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full bg-[var(--primary-container)] px-3 text-xs font-semibold text-[var(--on-primary-container)] disabled:opacity-50"
                >
                  <Copy size={16} strokeWidth={2.2} aria-hidden="true" />
                  <span>{t('settings.planTransfer.copyJson')}</span>
                </button>
              </div>
              <textarea
                readOnly
                value={formatJson(jsonDraft.data)}
                className="max-h-64 min-h-40 w-full resize-none rounded-lg bg-[var(--surface-container)] px-3 py-2 font-mono text-xs leading-5 text-[var(--on-surface)] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setMode('json-main')}
              className="min-h-10 rounded-full px-4 text-sm font-medium text-[var(--primary)]"
            >
              {t('common.back')}
            </button>
          </div>
        ) : null}

        {message ? (
          <p className="mt-3 rounded-xl bg-[var(--primary-container)] px-4 py-3 text-sm leading-5 text-[var(--on-primary-container)]">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="mt-3 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm leading-5 text-[var(--on-error-container)]">
            {error}
          </p>
        ) : null}
      </AnimatedSheet>

      <SharedPlanImportSheet
        open={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImported={(plans, data) => {
          const selectedPlanId = plans[0]?.id ?? null
          notifyPlansChanged(selectedPlanId)
          setIsImportOpen(false)
          onClose()
          navigate(data.cycle.length > 0 ? '/plans/cycle' : '/plans', {
            state: data.cycle.length > 0 ? undefined : { selectedPlanId },
          })
        }}
      />

      <PlanJsonImportSheet
        open={isJsonImportOpen}
        title={t('settings.planTransfer.pasteJson')}
        onClose={() => setIsJsonImportOpen(false)}
        onImported={(plans, data) => {
          const selectedPlanId = plans[0]?.id ?? null
          notifyPlansChanged(selectedPlanId)
          setIsJsonImportOpen(false)
          onClose()
          navigate(data.cycle.length > 0 ? '/plans/cycle' : '/plans', {
            state: data.cycle.length > 0 ? undefined : { selectedPlanId },
          })
        }}
      />

      <PlanShareSheet
        open={sharePlanIds !== null}
        planIds={sharePlanIds ?? []}
        onClose={() => setSharePlanIds(null)}
      />

      <PlanShareSheet
        open={isCycleShareOpen}
        kind="training-cycle"
        onClose={() => setIsCycleShareOpen(false)}
      />

      <SharedPlanRecordsSheet
        open={isRecordsOpen}
        onClose={() => setIsRecordsOpen(false)}
      />
    </>
  )
}
