import { useRef, useState } from 'react'
import { ClipboardPaste, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { AnimatedSheet } from '../motion/AnimatedSheet'
import { triggerHaptic } from '../../lib/haptics'
import {
  importPlanTransferData,
  parsePlanTransferJson,
  type PlanTransferData,
  type PlanTransferParseError,
} from '../../lib/plan-transfer'
import type { PlanWithExercises } from '../../db/plans'

type PlanJsonImportSheetProps = {
  onClose: () => void
  onImported?: (plans: PlanWithExercises[], data: PlanTransferData) => void
  open: boolean
  title: string
}

function getPlanTransferErrorMessage(
  t: ReturnType<typeof useTranslation>['t'],
  error: PlanTransferParseError,
) {
  if (error === 'missingJson') {
    return t('settings.planTransfer.errors.missingJson')
  }

  if (error === 'invalidJson') {
    return t('settings.planTransfer.errors.invalidJson')
  }

  if (error === 'emptyExercises') {
    return t('settings.planTransfer.errors.emptyExercises')
  }

  return t('settings.planTransfer.errors.invalidShape')
}

export function PlanJsonImportSheet({ onClose, onImported, open, title }: PlanJsonImportSheetProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [isPasteImportOpen, setIsPasteImportOpen] = useState(false)
  const [importText, setImportText] = useState('')

  function resetFeedback() {
    setMessage(null)
    setError(null)
  }

  function resetFlow() {
    setIsPasteImportOpen(false)
    setImportText('')
    resetFeedback()
  }

  async function importJsonText(text: string) {
    let importedPlans: PlanWithExercises[] | null = null
    let importedData: PlanTransferData | null = null

    try {
      setIsBusy(true)
      resetFeedback()
      const result = parsePlanTransferJson(text, t('common.unnamedPlan'))
      if (!result.ok) {
        setError(getPlanTransferErrorMessage(t, result.error))
        void triggerHaptic('error')
        return
      }

      const plans = await importPlanTransferData(result.data)
      if (plans.length === 0) {
        setError(t('settings.planTransfer.errors.emptyExercises'))
        void triggerHaptic('error')
        return
      }

      setMessage(t('settings.planTransfer.imported', { count: plans.length }))
      setImportText('')
      setIsPasteImportOpen(false)
      void triggerHaptic('success')
      importedPlans = plans
      importedData = result.data
    } catch (importError) {
      console.error(importError)
      setError(t('settings.planTransfer.errors.importFailed'))
      void triggerHaptic('error')
    } finally {
      setIsBusy(false)
    }

    if (importedPlans && importedData) {
      onImported?.(importedPlans, importedData)
    }
  }

  async function importFile(file: File) {
    try {
      await importJsonText(await file.text())
    } finally {
      if (inputRef.current) {
        inputRef.current.value = ''
      }
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) {
            void importFile(file)
          }
        }}
      />
      <AnimatedSheet
        open={open}
        onClose={() => {
          onClose()
          resetFlow()
        }}
        title={title}
      >
        {isPasteImportOpen ? (
          <div className="space-y-3">
            <textarea
              value={importText}
              onChange={(event) => setImportText(event.target.value)}
              placeholder={t('settings.planTransfer.pasteJsonPlaceholder')}
              className="min-h-40 w-full resize-none rounded-xl bg-[var(--surface)] px-3 py-3 text-sm leading-6 text-[var(--on-surface)] outline-none ring-1 ring-[var(--outline-variant)] transition-all focus:ring-[var(--primary)]"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-[var(--primary)]"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={() => void importJsonText(importText)}
                disabled={isBusy || !importText.trim()}
                className="rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50"
              >
                {t('settings.planTransfer.importPastedJson')}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                setImportText('')
                resetFeedback()
                setIsPasteImportOpen(true)
              }}
              disabled={isBusy}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[var(--surface)] px-4 text-left text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)] disabled:opacity-50"
            >
              <ClipboardPaste size={18} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden="true" />
              <span>{t('settings.planTransfer.pasteJson')}</span>
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isBusy}
              className="flex min-h-12 w-full items-center gap-3 rounded-xl bg-[var(--surface)] px-4 text-left text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--surface-container)] disabled:opacity-50"
            >
              <Upload size={18} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden="true" />
              <span>{t('settings.planTransfer.importJson')}</span>
            </button>
          </div>
        )}
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
    </>
  )
}
