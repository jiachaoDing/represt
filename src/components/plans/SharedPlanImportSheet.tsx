import { useState } from 'react'
import { ClipboardPaste, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { PlanWithExercises } from '../../db/plans'
import { triggerHaptic } from '../../lib/haptics'
import { importPlanTransferData, type PlanTransferData } from '../../lib/plan-transfer'
import { getSharedPlan, PlanShareApiError, type SharedPlanDetail } from '../../lib/plan-share-api'
import { AnimatedSheet } from '../motion/AnimatedSheet'
import { PlanTransferPreview } from './PlanTransferPreview'

type SharedPlanImportSheetProps = {
  open: boolean
  onClose: () => void
  onImported?: (plans: PlanWithExercises[], data: PlanTransferData) => void
}

function getPlanShareErrorMessage(
  t: ReturnType<typeof useTranslation>['t'],
  error: unknown,
) {
  if (error instanceof PlanShareApiError) {
    return t(`planShare.errors.${error.reason}`)
  }

  return t('planShare.errors.unknown')
}

export function SharedPlanImportSheet({ open, onClose, onImported }: SharedPlanImportSheetProps) {
  const { t } = useTranslation()
  const [code, setCode] = useState('')
  const [detail, setDetail] = useState<SharedPlanDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const isTrainingCycle = detail?.kind === 'training-cycle'

  function resetFlow() {
    setCode('')
    setDetail(null)
    setError(null)
    setMessage(null)
    setIsBusy(false)
  }

  function closeSheet() {
    onClose()
    resetFlow()
  }

  async function loadSharedPlan() {
    if (!code.trim()) {
      return
    }

    try {
      setIsBusy(true)
      setError(null)
      setMessage(null)
      setDetail(await getSharedPlan(code))
    } catch (loadError) {
      console.error(loadError)
      setDetail(null)
      setError(getPlanShareErrorMessage(t, loadError))
      void triggerHaptic('error')
    } finally {
      setIsBusy(false)
    }
  }

  async function importSharedPlan() {
    if (!detail) {
      return
    }

    try {
      setIsBusy(true)
      setError(null)
      const plans = await importPlanTransferData(detail.payload)
      if (plans.length === 0) {
        setError(t('settings.planTransfer.errors.emptyExercises'))
        void triggerHaptic('error')
        return
      }

      setMessage(t('settings.planTransfer.imported', { count: plans.length }))
      void triggerHaptic('success')
      onImported?.(plans, detail.payload)
    } catch (importError) {
      console.error(importError)
      setError(t('settings.planTransfer.errors.importFailed'))
      void triggerHaptic('error')
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <AnimatedSheet open={open} onClose={closeSheet} title={t('planShare.importTitle')}>
      <div className="space-y-3">
        {!detail ? (
          <>
            <label className="block">
              <span className="mb-2 block px-1 text-xs font-semibold text-[var(--on-surface-variant)]">
                {t('planShare.codeLabel')}
              </span>
              <input
                autoFocus
                value={code}
                onChange={(event) => {
                  setCode(event.target.value.toUpperCase())
                  setError(null)
                }}
                placeholder={t('planShare.codePlaceholder')}
                className="h-12 w-full rounded-xl bg-[var(--surface)] px-4 text-base font-semibold tracking-wide text-[var(--on-surface)] outline-none ring-1 ring-[var(--outline-variant)] transition-all focus:ring-[var(--primary)]"
              />
            </label>
            <button
              type="button"
              onClick={() => void loadSharedPlan()}
              disabled={isBusy || !code.trim()}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--on-primary)] disabled:opacity-50"
            >
              <Search size={18} strokeWidth={2.2} aria-hidden="true" />
              <span>{isBusy ? t('planShare.loading') : t('planShare.viewSharedPlan')}</span>
            </button>
          </>
        ) : (
          <>
            <section className="rounded-xl bg-[var(--surface)] px-4 py-3">
              <span className="text-xs font-bold text-[var(--primary)]">{detail.code}</span>
              <h3 className="mt-1 text-base font-bold text-[var(--on-surface)]">{detail.title}</h3>
              <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
                {isTrainingCycle
                  ? t('planShare.cycleSummary', {
                      days: detail.payload.cycle.length,
                      plans: detail.summary.planCount,
                      exercises: detail.summary.exerciseCount,
                    })
                  : t('planShare.sharedPlanSummary', {
                      count: detail.summary.exerciseCount,
                      exercises: detail.summary.mainExercises.join(t('planShare.exerciseSeparator')),
                    })}
              </p>
            </section>
            <PlanTransferPreview data={detail.payload} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDetail(null)
                  setMessage(null)
                  setError(null)
                }}
                disabled={isBusy}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-[var(--primary)] disabled:opacity-50"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={() => void importSharedPlan()}
                disabled={isBusy}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--on-primary)] disabled:opacity-50"
              >
                <ClipboardPaste size={16} strokeWidth={2.2} aria-hidden="true" />
                <span>
                  {isBusy
                    ? t('planShare.saving')
                    : isTrainingCycle
                      ? t('planShare.saveSharedCycle')
                      : t('planShare.saveSharedPlan')}
                </span>
              </button>
            </div>
          </>
        )}

        {message ? (
          <p className="rounded-xl bg-[var(--primary-container)] px-4 py-3 text-sm leading-5 text-[var(--on-primary-container)]">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm leading-5 text-[var(--on-error-container)]">
            {error}
          </p>
        ) : null}
      </div>
    </AnimatedSheet>
  )
}
