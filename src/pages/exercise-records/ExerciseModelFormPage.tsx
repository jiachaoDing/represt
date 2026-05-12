import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Trash2 } from 'lucide-react'

import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { PageHeader } from '../../components/ui/PageHeader'
import {
  measurementTypes,
  movementPatterns,
  type MeasurementType,
  type MovementPattern,
  type MuscleDistributionItem,
} from '../../domain/exercise-catalog'
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

type OpenSelect = 'measurementType' | 'movementPattern' | null

type FormSelectProps<T extends string> = {
  disabled: boolean
  isOpen: boolean
  label: string
  onChange: (value: T) => void
  onClose: () => void
  onToggle: () => void
  options: readonly T[]
  value: T
  getOptionLabel: (value: T) => string
}

function FormSelect<T extends string>({
  disabled,
  isOpen,
  label,
  onChange,
  onClose,
  onToggle,
  options,
  value,
  getOptionLabel,
}: FormSelectProps<T>) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target
      if (target instanceof Node && !rootRef.current?.contains(target)) {
        onClose()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen, onClose])

  return (
    <div ref={rootRef} className="block min-w-0">
      <span className="mb-3 block text-base font-bold text-[var(--on-surface)]">
        {label}
      </span>
      <span className="relative block">
        <button
          type="button"
          disabled={disabled}
          onClick={onToggle}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`flex h-16 w-full items-center justify-between gap-3 rounded-2xl border bg-[var(--surface-container)] px-4 text-left text-lg font-semibold text-[var(--on-surface)] outline-none transition-colors disabled:opacity-60 ${
            isOpen ? 'border-[var(--primary)]' : 'border-[var(--outline-variant)]'
          }`}
        >
          <span className="min-w-0 truncate">{getOptionLabel(value)}</span>
          <ChevronDown
            size={22}
            strokeWidth={2.4}
            className={`shrink-0 text-[var(--on-surface-variant)] transition-transform ${isOpen ? 'rotate-180' : ''}`}
            aria-hidden="true"
          />
        </button>
        {isOpen ? (
          <span
            role="listbox"
            className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-[var(--outline-variant)] bg-[var(--surface-container)] py-1 shadow-xl"
          >
            {options.map((option) => {
              const selected = option === value
              return (
                <button
                  key={option}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onChange(option)}
                  className={`block w-full appearance-none border-0 px-4 py-3 text-left text-base font-semibold transition-colors ${
                    selected
                      ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                      : 'bg-transparent text-[var(--on-surface)] hover:bg-[var(--surface-container-high)]'
                  }`}
                >
                  <span className="block truncate bg-transparent text-inherit">
                    {getOptionLabel(option)}
                  </span>
                </button>
              )
            })}
          </span>
        ) : null}
      </span>
    </div>
  )
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

function readExerciseModelName(state: unknown) {
  if (!state || typeof state !== 'object' || !('exerciseModelName' in state)) {
    return ''
  }

  const name = (state as Record<string, unknown>).exerciseModelName
  return typeof name === 'string' ? name : ''
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
  const [measurementType, setMeasurementType] = useState<MeasurementType>('weightReps')
  const [muscleDistribution, setMuscleDistribution] = useState<MuscleDistributionItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openSelect, setOpenSelect] = useState<OpenSelect>(null)

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
            || readExerciseModelName(location.state)
            || (result.catalogExerciseId ? getExerciseName(t, result.catalogExerciseId) : '')
          setName(initialName)
          setMovementPattern(result.movementPattern)
          setMeasurementType(result.measurementType)
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
  }, [location.state, profileId, t])

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
        measurementType,
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
      <PageHeader
        title={title}
        backFallbackTo={profileId ? `/summary/exercises/${encodeURIComponent(profileId)}` : '/summary/exercises'}
        titleClassName="text-[32px]"
      />

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
        <form className="mx-4 mt-8 space-y-8" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-3 block text-base font-bold text-[var(--on-surface)]">
              {t('plans.exerciseName')}
            </span>
            <input
              value={name}
              disabled={isSaving}
              onChange={(event) => setName(event.target.value)}
              className="h-16 w-full rounded-2xl border border-[var(--outline-variant)] bg-[var(--surface-container)] px-5 text-lg font-semibold text-[var(--on-surface)] outline-none transition-colors placeholder:text-[var(--on-surface-variant)] focus:border-[var(--primary)] disabled:opacity-60"
              placeholder={t('plans.exercisePlaceholder')}
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <FormSelect
              disabled={isSaving}
              getOptionLabel={(pattern) => getMovementPatternName(t, pattern)}
              isOpen={openSelect === 'movementPattern'}
              label={t('summary.exerciseRecords.movementPattern')}
              onChange={(nextPattern) => {
                setMovementPattern(nextPattern)
                setOpenSelect(null)
              }}
              onClose={() => setOpenSelect(null)}
              onToggle={() => setOpenSelect((current) => current === 'movementPattern' ? null : 'movementPattern')}
              options={movementPatterns}
              value={movementPattern}
            />

            <FormSelect
              disabled={isSaving}
              getOptionLabel={(type) => t(`summary.exerciseRecords.measurementTypeOptions.${type}`)}
              isOpen={openSelect === 'measurementType'}
              label={t('summary.exerciseRecords.measurementType')}
              onChange={(nextType) => {
                setMeasurementType(nextType)
                setOpenSelect(null)
              }}
              onClose={() => setOpenSelect(null)}
              onToggle={() => setOpenSelect((current) => current === 'measurementType' ? null : 'measurementType')}
              options={measurementTypes}
              value={measurementType}
            />
          </div>

          <section className="border-t border-[var(--outline-variant)] pt-8">
            <h2 className="text-2xl font-bold text-[var(--on-surface)]">{t('summary.exerciseRecords.muscleDistribution')}</h2>
            <p className="mt-2 text-base leading-6 text-[var(--on-surface-variant)]">
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
