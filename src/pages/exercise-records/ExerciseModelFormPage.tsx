import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { Trash2 } from 'lucide-react'

import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import { movementPatterns, type MovementPattern, type MuscleDistributionItem } from '../../domain/exercise-catalog'
import {
  getExerciseName,
  getMovementPatternName,
} from '../../lib/exercise-catalog-i18n'
import {
  getExerciseModelForm,
  saveExerciseModel,
  softDeleteExerciseModel,
  type ExerciseModelForm,
} from '../../db/sessions'
import { MuscleDistributionEditor } from './MuscleDistributionEditor'

type ExercisePickerReturnState = {
  backTo: string
  exercisePickerSelectedExercises: unknown[]
}

function isExercisePickerPath(value: string) {
  return value === '/exercise-picker'
    || value.startsWith('/exercise-picker?')
    || value.startsWith('/exercise-picker#')
}

function readExercisePickerReturnState(state: unknown): ExercisePickerReturnState | null {
  if (!state || typeof state !== 'object') {
    return null
  }

  const routeState = state as Record<string, unknown>
  if (typeof routeState.backTo !== 'string' || !isExercisePickerPath(routeState.backTo)) {
    return null
  }

  const selectedExercises = routeState.exercisePickerSelectedExercises
  return {
    backTo: routeState.backTo,
    exercisePickerSelectedExercises: Array.isArray(selectedExercises) ? selectedExercises : [],
  }
}

export function ExerciseModelFormPage({
  mode,
  profileId,
}: {
  mode: 'new' | 'edit'
  profileId: string | null
}) {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const [form, setForm] = useState<ExerciseModelForm | null>(null)
  const [name, setName] = useState('')
  const [movementPattern, setMovementPattern] = useState<MovementPattern>('fullBody')
  const [muscleDistribution, setMuscleDistribution] = useState<MuscleDistributionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    getExerciseModelForm(profileId)
      .then((result) => {
        if (isCancelled) {
          return
        }

        setForm(result)
        if (result) {
          const initialName = result.name.trim()
            || (result.catalogExerciseId ? getExerciseName(t, result.catalogExerciseId) : '')
          setName(initialName)
          setMovementPattern(result.movementPattern)
          setMuscleDistribution(result.muscleDistribution)
        }
      })
      .catch((loadError) => {
        console.error(loadError)
        if (!isCancelled) {
          setError(t('summary.exerciseRecords.modelLoadFailed'))
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false)
        }
      })

    return () => {
      isCancelled = true
    }
  }, [profileId, t])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!form) {
      return
    }

    try {
      setIsSaving(true)
      setError(null)
      const result = await saveExerciseModel({
        catalogExerciseId: form.catalogExerciseId,
        muscleDistribution,
        movementPattern,
        name,
        profileId: form.profileId,
      })

      if (result.status !== 'saved') {
        const errorKey = result.status === 'empty'
          ? 'summary.exerciseRecords.customNameRequired'
          : result.status === 'exists'
            ? 'summary.exerciseRecords.customAlreadyExists'
            : 'summary.exerciseRecords.notFound'
        setError(t(errorKey))
        return
      }

      const exercisePickerReturnState = readExercisePickerReturnState(location.state)
      if (exercisePickerReturnState) {
        navigate(exercisePickerReturnState.backTo, {
          replace: true,
          state: {
            exercisePickerSelectedExercises: exercisePickerReturnState.exercisePickerSelectedExercises,
            createdExerciseProfileId: result.profileId,
          },
        })
        return
      }

      navigate(`/summary/exercises/${encodeURIComponent(result.profileId)}`, { replace: true })
    } catch (saveError) {
      console.error(saveError)
      setError(t('summary.exerciseRecords.customSaveFailed'))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    if (!form?.profileId) {
      return
    }

    try {
      setIsSaving(true)
      await softDeleteExerciseModel(form.profileId)
      navigate('/summary/exercises', { replace: true })
    } catch (deleteError) {
      console.error(deleteError)
      setError(t('summary.exerciseRecords.deleteFailed'))
    } finally {
      setIsSaving(false)
      setIsDeleteDialogOpen(false)
    }
  }

  const title = mode === 'new'
    ? t('summary.exerciseRecords.addModelTitle')
    : t('summary.exerciseRecords.editModelTitle')

  return (
    <div className="pb-6">
      <PageHeader title={title} backFallbackTo={profileId ? `/summary/exercises/${encodeURIComponent(profileId)}` : '/summary/exercises'} />

      {error ? (
        <div className="mx-4 mt-4 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="mx-4 mt-4 h-64 rounded-[1.25rem] bg-[var(--surface-container)] opacity-60 animate-pulse" />
      ) : null}

      {!isLoading && !form ? (
        <section className="mx-4 mt-6 rounded-[1.25rem] border border-dashed border-[var(--outline-variant)]/40 bg-[var(--surface)] px-5 py-8 text-center">
          <p className="text-base font-semibold text-[var(--on-surface)]">{t('summary.exerciseRecords.notFound')}</p>
        </section>
      ) : null}

      {form ? (
        <form className="mx-4 mt-4 space-y-5" onSubmit={handleSubmit}>
          <label className="block rounded-[1.25rem] bg-[var(--surface)] p-4">
            <span className="mb-2 block text-xs font-semibold text-[var(--on-surface-variant)]">
              {t('plans.exerciseName')}
            </span>
            <input
              value={name}
              disabled={isSaving}
              onChange={(event) => setName(event.target.value)}
              className="w-full rounded-none border-b border-[var(--on-surface)] bg-transparent py-3 text-base text-[var(--on-surface)] outline-none transition-all focus:border-b-2 focus:border-[var(--primary)]"
              placeholder={t('plans.exercisePlaceholder')}
            />
          </label>

          <label className="block rounded-[1.25rem] bg-[var(--surface)] p-4">
            <span className="mb-2 block text-xs font-semibold text-[var(--on-surface-variant)]">
              {t('summary.exerciseRecords.movementPattern')}
            </span>
            <select
              value={movementPattern}
              disabled={isSaving}
              onChange={(event) => setMovementPattern(event.target.value as MovementPattern)}
              className="w-full rounded-xl bg-[var(--surface-container)] px-4 py-3 text-base font-medium text-[var(--on-surface)] outline-none"
            >
              {movementPatterns.map((pattern) => (
                <option key={pattern} value={pattern}>
                  {getMovementPatternName(t, pattern)}
                </option>
              ))}
            </select>
          </label>

          <section className="rounded-[1.25rem] bg-[var(--surface)] p-4">
            <h2 className="text-[16px] font-bold text-[var(--on-surface)]">{t('summary.exerciseRecords.muscleDistribution')}</h2>
            <p className="mt-1 text-xs text-[var(--on-surface-variant)]">
              {t('summary.exerciseRecords.editDistributionDescription')}
            </p>
            <MuscleDistributionEditor
              disabled={isSaving}
              value={muscleDistribution}
              onChange={setMuscleDistribution}
            />
          </section>

          <div className="flex items-center justify-between gap-3">
            {mode === 'edit' && form.profileId ? (
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setIsDeleteDialogOpen(true)}
                className="inline-flex h-12 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[var(--error)] transition-opacity disabled:opacity-40"
              >
                <Trash2 size={18} strokeWidth={2.3} aria-hidden="true" />
                {t('common.delete')}
              </button>
            ) : <span />}
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="inline-flex h-12 items-center justify-center rounded-full bg-[var(--primary)] px-6 text-sm font-semibold text-[var(--on-primary)] transition-opacity disabled:opacity-40"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      ) : null}

      <ConfirmDialog
        open={isDeleteDialogOpen}
        danger
        title={t('summary.exerciseRecords.deleteModelTitle')}
        description={t('summary.exerciseRecords.deleteModelDescription', { name })}
        confirmLabel={t('common.delete')}
        onCancel={() => setIsDeleteDialogOpen(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  )
}
