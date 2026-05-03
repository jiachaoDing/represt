import { useMemo, useState } from 'react'
import { AlertCircle, Check, ClipboardPaste, Copy, FileJson } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { PageHeader } from '../components/ui/PageHeader'
import { createPlanWithExercises } from '../db/plans'
import {
  parsePlanAiImportResponse,
  type PlanAiImportParseError,
  type PlanAiImportPlan,
} from '../lib/plan-ai-import-parser'
import { formatNumber } from '../lib/set-record-measurement'
import { triggerHaptic } from '../lib/haptics'

function getParseErrorMessage(t: ReturnType<typeof useTranslation>['t'], error: PlanAiImportParseError) {
  if (error === 'missingJson') {
    return t('plans.aiImport.errors.missingJson')
  }

  if (error === 'invalidJson') {
    return t('plans.aiImport.errors.invalidJson')
  }

  if (error === 'emptyExercises') {
    return t('plans.aiImport.errors.emptyExercises')
  }

  return t('plans.aiImport.errors.invalidShape')
}

export function PlanAiImportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prompt = t('plans.aiImport.prompt')
  const [aiResponse, setAiResponse] = useState('')
  const [previewPlan, setPreviewPlan] = useState<PlanAiImportPlan | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const canCreate = previewPlan !== null && previewPlan.exercises.length > 0 && !isSubmitting

  const previewExerciseCount = previewPlan?.exercises.length ?? 0
  const promptRows = useMemo(() => Math.min(12, Math.max(7, prompt.split('\n').length)), [prompt])

  async function copyPrompt() {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch (copyError) {
      console.error(copyError)
      setError(t('plans.aiImport.errors.copyFailed'))
      void triggerHaptic('error')
    }
  }

  function handleResponseChange(value: string) {
    setAiResponse(value)
    setPreviewPlan(null)
    setError(null)
  }

  function parseResponse() {
    const result = parsePlanAiImportResponse(aiResponse, t('common.unnamedPlan'))
    if (!result.ok) {
      setPreviewPlan(null)
      setError(getParseErrorMessage(t, result.error))
      void triggerHaptic('error')
      return
    }

    setPreviewPlan(result.plan)
    setError(null)
  }

  async function createImportedPlan() {
    if (!canCreate || !previewPlan) {
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const plan = await createPlanWithExercises(previewPlan.planName, previewPlan.exercises)
      if (!plan) {
        setError(t('plans.aiImport.errors.emptyExercises'))
        void triggerHaptic('error')
        return
      }

      void triggerHaptic('success')
      navigate('/plans', { replace: true, state: { selectedPlanId: plan.id } })
    } catch (saveError) {
      console.error(saveError)
      setError(t('plans.aiImport.errors.saveFailed'))
      void triggerHaptic('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="pb-4">
      <PageHeader title={t('plans.aiImport.title')} backFallbackTo="/plans" />

      <div className="mx-4 mt-3 space-y-4">
        <section className="rounded-2xl border border-[var(--outline-variant)]/40 bg-[var(--surface)] p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileJson size={18} strokeWidth={2.2} className="shrink-0 text-[var(--primary)]" />
              <h2 className="truncate text-base font-bold text-[var(--on-surface)]">
                {t('plans.aiImport.promptTitle')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void copyPrompt()}
              aria-label={t('plans.aiImport.copyPrompt')}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-[var(--primary-container)] px-3 text-xs font-semibold text-[var(--on-primary-container)] transition-opacity disabled:opacity-40"
            >
              {copied ? <Check size={16} strokeWidth={2.4} /> : <Copy size={16} strokeWidth={2.2} />}
              <span>{copied ? t('plans.aiImport.copied') : t('plans.aiImport.copyPrompt')}</span>
            </button>
          </div>
          <textarea
            readOnly
            rows={promptRows}
            value={prompt}
            className="w-full resize-none rounded-xl bg-[var(--surface-container)] px-4 py-3 text-sm leading-6 text-[var(--on-surface)] outline-none"
          />
        </section>

        <section className="rounded-2xl border border-[var(--outline-variant)]/40 bg-[var(--surface)] p-4">
          <label className="block">
            <span className="mb-2 flex items-center gap-2 text-base font-bold text-[var(--on-surface)]">
              <ClipboardPaste size={18} strokeWidth={2.2} className="text-[var(--primary)]" />
              {t('plans.aiImport.responseTitle')}
            </span>
            <textarea
              value={aiResponse}
              onChange={(event) => handleResponseChange(event.target.value)}
              rows={9}
              className="w-full resize-y rounded-xl bg-[var(--surface-container)] px-4 py-3 text-sm leading-6 text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
              placeholder={t('plans.aiImport.responsePlaceholder')}
            />
          </label>
          <button
            type="button"
            onClick={parseResponse}
            disabled={!aiResponse.trim() || isSubmitting}
            aria-label={t('plans.aiImport.parse')}
            className="mt-3 inline-flex h-10 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-40"
          >
            {t('plans.aiImport.parse')}
          </button>
        </section>

        {error ? (
          <div className="flex gap-2 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm leading-5 text-[var(--on-error-container)]">
            <AlertCircle size={18} strokeWidth={2.2} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="rounded-2xl border border-[var(--outline-variant)]/40 bg-[var(--surface)] p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-[var(--on-surface)]">
                {t('plans.aiImport.previewTitle')}
              </h2>
              <p className="mt-1 text-xs font-medium text-[var(--on-surface-variant)]">
                {t('summary.exerciseCount', { count: previewExerciseCount })}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void createImportedPlan()}
              disabled={!canCreate}
              aria-label={t('plans.aiImport.create')}
              className="shrink-0 rounded-full bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-40"
            >
              {isSubmitting ? t('plans.aiImport.creating') : t('plans.aiImport.create')}
            </button>
          </div>

          {previewPlan ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-[var(--surface-container)] px-4 py-3">
                <span className="text-xs font-medium text-[var(--on-surface-variant)]">
                  {t('plans.planName')}
                </span>
                <p className="mt-1 truncate text-base font-semibold text-[var(--on-surface)]">
                  {previewPlan.planName}
                </p>
              </div>

              <div className="space-y-2">
                {previewPlan.exercises.map((exercise, index) => {
                  const valueParts = [
                    exercise.weightKg === null ? null : t('common.kg', { value: formatNumber(exercise.weightKg) }),
                    exercise.reps === null ? null : t('common.reps', { value: exercise.reps }),
                    exercise.durationSeconds === null
                      ? null
                      : t('common.seconds', { value: exercise.durationSeconds }),
                    exercise.distanceMeters === null
                      ? null
                      : t('common.meters', { value: formatNumber(exercise.distanceMeters) }),
                  ].filter((part): part is string => part !== null)

                  return (
                    <div
                      key={`${exercise.name}-${index}`}
                      className="rounded-xl bg-[var(--surface-container)] px-4 py-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--on-surface)]">
                          {exercise.name}
                        </p>
                        <span className="shrink-0 text-xs font-medium text-[var(--primary)]">
                          {t('plans.exerciseMeta', {
                            sets: exercise.targetSets,
                            seconds: exercise.restSeconds,
                          })}
                        </span>
                      </div>
                      {valueParts.length > 0 ? (
                        <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
                          {valueParts.join(' · ')}
                        </p>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-dashed border-[var(--outline)] px-4 py-5 text-center text-sm font-medium text-[var(--on-surface-variant)]">
              {t('plans.aiImport.previewEmpty')}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
