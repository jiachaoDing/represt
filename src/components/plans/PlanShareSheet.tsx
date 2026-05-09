import { useEffect, useMemo, useState } from 'react'
import { Check, Copy, Link, Share2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { addSharedPlanRecord } from '../../db/shared-plan-records'
import { buildPlanTemplateExport, buildTrainingCycleExport, type PlanTransferData } from '../../lib/plan-transfer'
import {
  createSharedPlan,
  PlanShareApiError,
  type CreateSharedPlanResult,
  type SharedPlanKind,
} from '../../lib/plan-share-api'
import {
  buildPlanShareText,
  getPlanTransferExerciseCount,
  getPlanTransferMainExercises,
  getPlanTransferShareTitle,
} from '../../lib/plan-share-text'
import { triggerHaptic } from '../../lib/haptics'
import i18n from '../../i18n'
import { AnimatedSheet } from '../motion/AnimatedSheet'

type PlanShareSheetProps = {
  open: boolean
  onClose: () => void
  kind?: SharedPlanKind
  planId?: string | null
  planIds?: string[]
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

export function PlanShareSheet({ open, onClose, kind = 'plan-template', planId = null, planIds }: PlanShareSheetProps) {
  const { t } = useTranslation()
  const [data, setData] = useState<PlanTransferData | null>(null)
  const [result, setResult] = useState<CreateSharedPlanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isBusy, setIsBusy] = useState(false)

  const shareText = useMemo(
    () => (data && result ? buildPlanShareText(t, data, result.code, result.url, kind) : ''),
    [data, kind, result, t],
  )
  const mainExercises = data ? getPlanTransferMainExercises(data) : []
  const isTrainingCycle = kind === 'training-cycle'
  const canCreateShare = Boolean(
    data &&
      (isTrainingCycle ? data.cycle.length > 0 && data.plans.length > 0 : data.plans.length > 0),
  )

  useEffect(() => {
    const selectedPlanIds = planIds ?? (planId ? [planId] : [])
    if (!open || (kind === 'plan-template' && selectedPlanIds.length === 0)) {
      return
    }

    let cancelled = false

    async function prepareDraft() {
      try {
        setIsBusy(true)
        setError(null)
        setMessage(null)
        setResult(null)
        const draft =
          kind === 'training-cycle'
            ? await buildTrainingCycleExport()
            : await buildPlanTemplateExport(selectedPlanIds)
        if (!cancelled) {
          setData(draft)
          if (!draft || (kind === 'plan-template' && draft.plans.length === 0)) {
            setError(t('planShare.errors.emptyPlan'))
          } else if (kind === 'training-cycle' && (draft.cycle.length === 0 || draft.plans.length === 0)) {
            setError(t('planShare.errors.emptyCycle'))
          }
        }
      } catch (draftError) {
        console.error(draftError)
        if (!cancelled) {
          setError(t('planShare.errors.createFailed'))
        }
      } finally {
        if (!cancelled) {
          setIsBusy(false)
        }
      }
    }

    void prepareDraft()

    return () => {
      cancelled = true
    }
  }, [kind, open, planId, planIds, t])

  function resetAndClose() {
    onClose()
    setData(null)
    setResult(null)
    setError(null)
    setMessage(null)
    setIsBusy(false)
  }

  async function createShare() {
    if (!data) {
      return
    }

    try {
      setIsBusy(true)
      setError(null)
      setMessage(null)
      const created = await createSharedPlan(data, kind, i18n.resolvedLanguage ?? i18n.language)
      setResult(created)
      try {
        await addSharedPlanRecord({
          code: created.code,
          url: created.url,
          title: isTrainingCycle
            ? t('planShare.cycleName')
            : getPlanTransferShareTitle(t, data, kind),
          createdAt: new Date().toISOString(),
          expiresAt: created.expiresAt,
        })
      } catch (recordError) {
        console.error(recordError)
        setError(t('planShare.errors.recordSaveFailed'))
      }
      void triggerHaptic('success')
    } catch (shareError) {
      console.error(shareError)
      setError(getPlanShareErrorMessage(t, shareError))
      void triggerHaptic('error')
    } finally {
      setIsBusy(false)
    }
  }

  async function copyText(text: string, successKey: string) {
    try {
      setError(null)
      await navigator.clipboard.writeText(text)
      setMessage(t(successKey))
      void triggerHaptic('success')
    } catch (copyError) {
      console.error(copyError)
      setError(t('planShare.errors.copyFailed'))
      void triggerHaptic('error')
    }
  }

  return (
    <AnimatedSheet open={open} onClose={resetAndClose} title={isTrainingCycle ? t('planShare.cycleTitle') : t('planShare.title')}>
      <div className="space-y-3">
        {data ? (
          <section className="rounded-xl bg-[var(--surface)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--on-surface)]">
              {getPlanTransferShareTitle(t, data, kind)}
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
              {isTrainingCycle
                ? t('planShare.cycleSummary', {
                    days: data.cycle.length,
                    plans: data.plans.length,
                    exercises: getPlanTransferExerciseCount(data),
                  })
                : data.plans.length > 1
                  ? t('planShare.multiPlanSummary', {
                      plans: data.plans.length,
                      exercises: getPlanTransferExerciseCount(data),
                      names: data.plans.map((plan) => plan.planName || t('common.unnamedPlan')).join(t('planShare.exerciseSeparator')),
                    })
                : t('planShare.summary', {
                    count: getPlanTransferExerciseCount(data),
                    exercises: mainExercises.join(t('planShare.exerciseSeparator')),
                  })}
            </p>
          </section>
        ) : null}

        <p className="rounded-xl bg-[var(--surface)] px-4 py-3 text-xs leading-5 text-[var(--on-surface-variant)]">
          {isTrainingCycle ? t('planShare.cyclePrivacyNote') : t('planShare.privacyNote')}
        </p>

        {result ? (
          <div className="space-y-2">
            <div className="rounded-xl bg-[var(--surface)] p-2">
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <span className="text-xs font-bold text-[var(--primary)]">{result.code}</span>
                <button
                  type="button"
                  onClick={() => void copyText(shareText, 'planShare.copiedText')}
                  disabled={isBusy || !shareText}
                  aria-label={t('planShare.copyShareText')}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--on-surface)] transition-colors hover:bg-[var(--on-surface)]/10 disabled:opacity-50"
                >
                  <Copy size={16} strokeWidth={2.2} aria-hidden="true" />
                </button>
              </div>
              <textarea
                readOnly
                value={shareText}
                className="scrollbar-hide max-h-64 min-h-40 w-full resize-none rounded-lg bg-[var(--surface-container)] px-3 py-2 text-sm leading-6 text-[var(--on-surface)] outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  window.location.assign(result.url)
                }}
                disabled={isBusy}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--on-surface)] disabled:opacity-50"
              >
                <Link size={16} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden="true" />
                <span>{t('planShare.viewPreview')}</span>
              </button>
              <button
                type="button"
                onClick={() => void copyText(result.code, 'planShare.copiedCode')}
                disabled={isBusy}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--surface)] px-3 text-xs font-semibold text-[var(--on-surface)] disabled:opacity-50"
              >
                <Copy size={16} strokeWidth={2.2} className="text-[var(--primary)]" aria-hidden="true" />
                <span>{t('planShare.copyCode')}</span>
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void createShare()}
            disabled={isBusy || !canCreateShare}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 text-sm font-bold text-[var(--on-primary)] disabled:opacity-50"
          >
            <Share2 size={18} strokeWidth={2.2} aria-hidden="true" />
            <span>{isBusy ? t('planShare.creating') : t('planShare.create')}</span>
          </button>
        )}

        {message ? (
          <p className="flex items-center gap-2 rounded-xl bg-[var(--primary-container)] px-4 py-3 text-sm leading-5 text-[var(--on-primary-container)]">
            <Check size={16} strokeWidth={2.4} aria-hidden="true" />
            <span>{message}</span>
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
