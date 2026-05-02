import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PlanNameSheet } from '../components/plans/PlanNameSheet'
import { PageHeader } from '../components/ui/PageHeader'
import { createPlan, listPlansWithExercises, type PlanWithExercises } from '../db/plans'
import { setTrainRestTrainingCycle } from '../db/training-cycle'
import { triggerHaptic } from '../lib/haptics'

export function StarterPlanPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [plans, setPlans] = useState<PlanWithExercises[]>([])
  const [newPlanName, setNewPlanName] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function loadPlans(preferredPlanId?: string) {
    const items = await listPlansWithExercises()
    const orderedItems = preferredPlanId
      ? [
          ...items.filter((plan) => plan.id === preferredPlanId),
          ...items.filter((plan) => plan.id !== preferredPlanId),
        ]
      : items
    setPlans(orderedItems)
  }

  useEffect(() => {
    async function initialize() {
      try {
        setError(null)
        await loadPlans()
      } catch (loadError) {
        console.error(loadError)
        setError(t('plans.loadFailed'))
      } finally {
        setIsLoading(false)
      }
    }

    void initialize()
  }, [t])

  async function runMutation(action: () => Promise<void>) {
    try {
      setIsSubmitting(true)
      setError(null)
      await action()
      return true
    } catch (mutationError) {
      console.error(mutationError)
      setError(t('starterPlan.saveFailed'))
      void triggerHaptic('error')
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  async function selectPlan(planId: string) {
    const didSave = await runMutation(async () => {
      await setTrainRestTrainingCycle(planId)
    })

    if (didSave) {
      void triggerHaptic('success')
      navigate('/', { replace: true })
    }
  }

  async function handleCreatePlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const didCreate = await runMutation(async () => {
      const plan = await createPlan(newPlanName || t('common.unnamedPlan'))
      setNewPlanName('')
      setIsCreateOpen(false)
      await loadPlans(plan.id)
    })

    if (didCreate) {
      void triggerHaptic('success')
    }
  }

  return (
    <div className="pb-4">
      <PageHeader
        title={t('starterPlan.title')}
        subtitle={t('starterPlan.subtitle')}
        backFallbackTo="/"
      />

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      <section className="mx-4 mt-3 rounded-2xl border border-[var(--outline-variant)]/40 bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--on-surface)]">
              {t('starterPlan.pickTitle')}
            </h2>
            <p className="mt-1 text-sm leading-5 text-[var(--on-surface-variant)]">
              {t('starterPlan.pickDescription')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="shrink-0 rounded-full border border-[var(--outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--primary)]"
          >
            {t('plans.newPlan')}
          </button>
        </div>

        <div className="mt-4 grid gap-2">
          {isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-[4.5rem] animate-pulse rounded-xl bg-[var(--surface-container)] opacity-60"
                />
              ))
            : plans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  disabled={isSubmitting}
                  onClick={() =>
                    plan.exercises.length > 0
                      ? void selectPlan(plan.id)
                      : navigate('/plans')
                  }
                  className="flex min-h-[4.5rem] w-full items-center justify-between gap-3 rounded-xl bg-[var(--surface-container)] px-4 text-left transition-opacity disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-base font-semibold text-[var(--on-surface)]">
                      {plan.name}
                    </span>
                    <span className="mt-1 block text-xs font-medium text-[var(--on-surface-variant)]">
                      {t('summary.exerciseCount', { count: plan.exercises.length })}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-[var(--primary)]">
                    {plan.exercises.length > 0 ? t('starterPlan.useToday') : t('common.edit')}
                  </span>
                </button>
              ))}
        </div>
      </section>

      <PlanNameSheet
        createName={newPlanName}
        isOpen={isCreateOpen}
        isSubmitting={isSubmitting}
        mode="create"
        renameName=""
        onClose={() => setIsCreateOpen(false)}
        onCreateNameChange={setNewPlanName}
        onRenameNameChange={() => undefined}
        onSubmit={(event) => void handleCreatePlan(event)}
      />
    </div>
  )
}
