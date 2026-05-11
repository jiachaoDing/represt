import { useMemo, useState } from 'react'
import { AlertCircle, Check, ChevronDown, ChevronUp, ClipboardPaste, Copy, FileJson, ListChecks } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { AnimatedDialog } from '../components/motion/AnimatedDialog'
import { PageHeader } from '../components/ui/PageHeader'
import { createPlanWithExercises, type PlanWithExercises } from '../db/plans'
import {
  parsePlanAiImportResponse,
  type PlanAiImportData,
  type PlanAiImportParseError,
} from '../lib/plan-ai-import-parser'
import { formatNumber } from '../lib/set-record-measurement'
import { triggerHaptic } from '../lib/haptics'
import { setTrainingCycleSlots } from '../db/training-cycle'

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

function getExerciseValueParts(
  t: ReturnType<typeof useTranslation>['t'],
  exercise: PlanAiImportData['plans'][number]['exercises'][number],
) {
  return [
    exercise.weightKg === null ? null : t('common.kg', { value: formatNumber(exercise.weightKg) }),
    exercise.reps === null ? null : t('common.reps', { value: exercise.reps }),
    exercise.durationSeconds === null ? null : t('common.seconds', { value: exercise.durationSeconds }),
    exercise.distanceMeters === null ? null : t('common.meters', { value: formatNumber(exercise.distanceMeters) }),
  ].filter((part): part is string => part !== null)
}

export function PlanAiImportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const prompt = t('plans.aiImport.prompt')
  const [aiResponse, setAiResponse] = useState('')
  const [confirmImport, setConfirmImport] = useState<PlanAiImportData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPromptCollapsed, setIsPromptCollapsed] = useState(false)
  const [isResponseFocused, setIsResponseFocused] = useState(false)
  const canCreate = confirmImport !== null && confirmImport.plans.length > 0 && !isSubmitting

  const promptRows = useMemo(() => Math.min(8, Math.max(4, prompt.split('\n').length)), [prompt])

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

  async function pasteResponse() {
    try {
      const text = await navigator.clipboard.readText()
      handleResponseChange(text)
    } catch (pasteError) {
      console.error(pasteError)
      setError(t('plans.aiImport.errors.pasteFailed'))
      void triggerHaptic('error')
    }
  }

  function handleResponseChange(value: string) {
    setAiResponse(value)
    setConfirmImport(null)
    setError(null)
    if (value.trim().length > 0) {
      setIsPromptCollapsed(true)
      return
    }

    if (!isResponseFocused) {
      setIsPromptCollapsed(false)
    }
  }

  function parseResponse() {
    const result = parsePlanAiImportResponse(aiResponse, t('common.unnamedPlan'))
    if (!result.ok) {
      setConfirmImport(null)
      setError(getParseErrorMessage(t, result.error))
      void triggerHaptic('error')
      return
    }

    setConfirmImport(result.data)
    setError(null)
  }

  async function createImportedPlan() {
    if (!canCreate || !confirmImport) {
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const plans: PlanWithExercises[] = []
      for (const importPlan of confirmImport.plans) {
        const plan = await createPlanWithExercises(importPlan.planName, importPlan.exercises)
        if (plan) {
          plans.push(plan)
        }
      }

      if (plans.length === 0) {
        setError(t('plans.aiImport.errors.emptyExercises'))
        setConfirmImport(null)
        void triggerHaptic('error')
        return
      }

      if (confirmImport.cycle.length > 0) {
        await setTrainingCycleSlots(
          confirmImport.cycle.map((slot) => (slot.planIndex === null ? null : plans[slot.planIndex]?.id ?? null)),
        )
      }

      void triggerHaptic('success')
      navigate('/plans', { replace: true, state: { selectedPlanId: plans[0].id } })
    } catch (saveError) {
      console.error(saveError)
      setError(t('plans.aiImport.errors.saveFailed'))
      setConfirmImport(null)
      void triggerHaptic('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader title={t('plans.aiImport.title')} backFallbackTo="/plans" />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-[calc(1rem_+_env(safe-area-inset-bottom))]">
        <section className="shrink-0 rounded-2xl border border-[var(--outline-variant)]/40 bg-[var(--surface)] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <FileJson size={18} strokeWidth={2.2} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
              <h2 className="truncate text-base font-bold text-[var(--on-surface)]">
                {t('plans.aiImport.promptTitle')}
              </h2>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => void copyPrompt()}
                aria-label={t('plans.aiImport.copyPrompt')}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] transition-opacity"
              >
                {copied ? <Check size={17} strokeWidth={2.4} aria-hidden="true" /> : <Copy size={17} strokeWidth={2.2} aria-hidden="true" />}
              </button>
              <button
                type="button"
                onClick={() => setIsPromptCollapsed((current) => !current)}
                aria-label={
                  isPromptCollapsed ? t('plans.aiImport.expandPrompt') : t('plans.aiImport.collapsePrompt')
                }
                aria-expanded={!isPromptCollapsed}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--on-surface)] transition-opacity"
              >
                {isPromptCollapsed ? (
                  <ChevronDown size={17} strokeWidth={2.3} aria-hidden="true" />
                ) : (
                  <ChevronUp size={17} strokeWidth={2.3} aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
          {!isPromptCollapsed ? (
            <textarea
              id="ai-import-prompt"
              readOnly
              rows={promptRows}
              value={prompt}
              className="w-full resize-none rounded-xl bg-[var(--surface-container)] px-3 py-2 text-xs leading-5 text-[var(--on-surface)] outline-none"
            />
          ) : null}
        </section>

        <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-[var(--outline-variant)]/40 bg-[var(--surface)] p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <ClipboardPaste size={18} strokeWidth={2.2} className="shrink-0 text-[var(--primary)]" aria-hidden="true" />
              <h2 className="truncate text-base font-bold text-[var(--on-surface)]">
                {t('plans.aiImport.responseTitle')}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => void pasteResponse()}
              aria-label={t('plans.aiImport.pasteResponse')}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] transition-opacity"
            >
              <ClipboardPaste size={17} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </div>
          <textarea
            value={aiResponse}
            onFocus={() => {
              setIsResponseFocused(true)
              setIsPromptCollapsed(true)
            }}
            onBlur={() => {
              setIsResponseFocused(false)
              if (!aiResponse.trim()) {
                setIsPromptCollapsed(false)
              }
            }}
            onChange={(event) => handleResponseChange(event.target.value)}
            className="min-h-[8rem] flex-1 resize-none rounded-xl bg-[var(--surface-container)] px-3 py-3 text-sm leading-6 text-[var(--on-surface)] outline-none ring-1 ring-transparent transition-all focus:ring-[var(--primary)]"
            placeholder={t('plans.aiImport.responsePlaceholder')}
          />
        </section>

        {error ? (
          <div className="flex shrink-0 gap-2 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm leading-5 text-[var(--on-error-container)]">
            <AlertCircle size={18} strokeWidth={2.2} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        ) : null}

        <section className="shrink-0 border-t border-[var(--outline-variant)]/35 bg-[var(--surface)] pt-3">
          <button
            type="button"
            onClick={parseResponse}
            disabled={!aiResponse.trim() || isSubmitting}
            aria-label={t('plans.aiImport.parse')}
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 text-base font-bold text-[var(--on-primary)] shadow-[var(--shadow-soft)] transition-transform active:scale-[0.98] disabled:opacity-40"
          >
            {t('plans.aiImport.parse')}
          </button>
        </section>
      </div>

      <AnimatedDialog
        open={confirmImport !== null}
        onClose={() => {
          if (!isSubmitting) {
            setConfirmImport(null)
          }
        }}
      >
        {confirmImport ? (
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-import-confirm-title"
            className="w-full max-w-[22rem] rounded-[28px] bg-[var(--surface-container)] p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)]">
                <ListChecks size={21} strokeWidth={2.2} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h2 id="ai-import-confirm-title" className="text-xl font-bold text-[var(--on-surface)]">
                  {t('plans.aiImport.confirmTitle')}
                </h2>
                <p className="mt-1 text-sm leading-5 text-[var(--on-surface-variant)]">
                  {t('plans.aiImport.confirmSupporting')}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--surface)] px-4 py-3">
              <span className="text-xs font-medium text-[var(--on-surface-variant)]">
                {t('plans.aiImport.planCount', { count: confirmImport.plans.length })}
              </span>
              <p className="mt-1 truncate text-base font-semibold text-[var(--on-surface)]">
                {confirmImport.plans.map((plan) => plan.planName).join(' / ')}
              </p>
              <p className="mt-1 text-xs font-medium text-[var(--primary)]">
                {t('summary.exerciseCount', {
                  count: confirmImport.plans.reduce((total, plan) => total + plan.exercises.length, 0),
                })}
              </p>
            </div>

            <h3 className="mb-2 mt-4 text-xs font-semibold text-[var(--on-surface-variant)]">
              {t('plans.aiImport.exerciseListTitle')}
            </h3>
            <div className="max-h-[min(18rem,48dvh)] space-y-2 overflow-y-auto pr-1">
              {confirmImport.plans.map((plan, planIndex) => (
                <div key={`${plan.planName}-${planIndex}`} className="rounded-xl bg-[var(--surface)] px-4 py-3">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h4 className="min-w-0 flex-1 truncate text-sm font-bold text-[var(--on-surface)]">
                      {plan.planName}
                    </h4>
                    <span className="shrink-0 text-xs font-medium text-[var(--primary)]">
                      {t('summary.exerciseCount', { count: plan.exercises.length })}
                    </span>
                  </div>
                  <div className="space-y-2 border-t border-[var(--outline-variant)]/35 pt-2">
                    {plan.exercises.map((exercise, exerciseIndex) => {
                      const valueParts = getExerciseValueParts(t, exercise)

                      return (
                        <div key={`${exercise.name}-${exerciseIndex}`}>
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
                            <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
                              <span className="font-medium">{t('plans.aiImport.optionalFields')}</span>
                              <span>{valueParts.join(' · ')}</span>
                            </p>
                          ) : null}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {confirmImport.cycle.length > 0 ? (
              <>
                <h3 className="mb-2 mt-4 text-xs font-semibold text-[var(--on-surface-variant)]">
                  {t('plans.aiImport.cyclePreviewTitle')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {confirmImport.cycle.map((slot, index) => {
                    const plan = slot.planIndex === null ? null : confirmImport.plans[slot.planIndex] ?? null

                    return (
                      <span
                        key={index}
                        className="rounded-full bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--on-surface)]"
                      >
                        {t('plans.aiImport.cycleDayLabel', {
                          day: index + 1,
                          name: plan ? plan.planName : t('plans.aiImport.cycleRestDay'),
                        })}
                      </span>
                    )
                  })}
                </div>
              </>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmImport(null)}
                disabled={isSubmitting}
                className="rounded-full px-4 py-2.5 text-sm font-medium text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10 disabled:opacity-40"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => void createImportedPlan()}
                disabled={!canCreate}
                className="rounded-full bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-40"
              >
                {isSubmitting ? t('plans.aiImport.creating') : t('plans.aiImport.create')}
              </button>
            </div>
          </section>
        ) : null}
      </AnimatedDialog>
    </div>
  )
}
