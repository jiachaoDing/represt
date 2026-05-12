import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Check, Plus, Search, ShoppingBasket, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '../components/ui/PageHeader'
import { BottomSheet } from '../components/ui/BottomSheet'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { muscleGroups, type MeasurementType, type MuscleGroup } from '../domain/exercise-catalog'
import { createPlanExercises, listPlansWithExercises } from '../db/plans'
import { addTemporarySessionPlanItems, getOrCreateTodaySession, listExerciseModelOptions, type ExerciseModelOption } from '../db/sessions'
import { findExerciseNameSuggestions } from '../lib/exercise-dictionary'
import {
  getExerciseName,
  getExerciseAliases,
  getMovementPatternName,
  getMuscleGroupName,
} from '../lib/exercise-catalog-i18n'
import { triggerHaptic } from '../lib/haptics'
import { useBackLinkState } from '../hooks/useRouteBack'

type PickerTarget = 'today' | 'plan'
type PickerCategory = MuscleGroup | 'all' | 'other'

type SelectedExercise = {
  key: string
  name: string
  catalogExerciseId: string | null
  measurementType?: MeasurementType | null
}

function isSelectedExercise(value: unknown): value is SelectedExercise {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Record<string, unknown>
  return typeof item.key === 'string'
    && typeof item.name === 'string'
    && (typeof item.catalogExerciseId === 'string' || item.catalogExerciseId === null)
    && (!('measurementType' in item) || typeof item.measurementType === 'string' || item.measurementType === null)
}

function readSelectedExercisesFromState(state: unknown) {
  if (!state || typeof state !== 'object' || !('exercisePickerSelectedExercises' in state)) {
    return []
  }

  const selectedExercises = (state as Record<string, unknown>).exercisePickerSelectedExercises
  return Array.isArray(selectedExercises)
    ? selectedExercises.filter(isSelectedExercise)
    : []
}

function readCreatedExerciseProfileId(state: unknown) {
  if (!state || typeof state !== 'object' || !('createdExerciseProfileId' in state)) {
    return null
  }

  const profileId = (state as Record<string, unknown>).createdExerciseProfileId
  return typeof profileId === 'string' ? profileId : null
}

function getPickerTarget(value: string | null): PickerTarget {
  return value === 'plan' ? 'plan' : 'today'
}

function normalizeKeyword(value: string) {
  return value.normalize('NFKC').trim().toLowerCase()
}

function getModelDisplayName(t: ReturnType<typeof useTranslation>['t'], model: ExerciseModelOption) {
  return model.name.trim() || (model.catalogExerciseId ? getExerciseName(t, model.catalogExerciseId) : '')
}

function formatExerciseMeta(
  t: ReturnType<typeof useTranslation>['t'],
  model: ExerciseModelOption,
) {
  const category = model.categoryId === 'other'
    ? t('summary.analytics.otherDistribution')
    : getMuscleGroupName(t, model.categoryId)
  const movementPattern = getMovementPatternName(t, model.movementPattern)

  return t('exercisePicker.exerciseMeta', {
    muscles: category,
    pattern: movementPattern,
  })
}

export function ExercisePickerPage() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const backLinkState = useBackLinkState()
  const [searchParams] = useSearchParams()
  const target = getPickerTarget(searchParams.get('target'))
  const planId = searchParams.get('planId')
  const [categoryId, setCategoryId] = useState<PickerCategory>('all')
  const [keyword, setKeyword] = useState('')
  const [selectedExercises, setSelectedExercises] = useState<SelectedExercise[]>(() =>
    readSelectedExercisesFromState(location.state),
  )
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isContinueDialogOpen, setIsContinueDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exerciseModels, setExerciseModels] = useState<ExerciseModelOption[]>([])

  useEffect(() => {
    let isCancelled = false

    listExerciseModelOptions()
      .then((models) => {
        if (!isCancelled) {
          setExerciseModels(models)
        }
      })
      .catch((loadError) => {
        console.error(loadError)
        if (!isCancelled) {
          setError(t('exercisePicker.loadFailed'))
        }
      })

    return () => {
      isCancelled = true
    }
  }, [t])

  useEffect(() => {
    let isCancelled = false
    const createdProfileId = readCreatedExerciseProfileId(location.state)
    if (!createdProfileId || exerciseModels.length === 0) {
      return
    }

    const createdModel = exerciseModels.find((model) => model.profileId === createdProfileId)
    if (!createdModel) {
      return
    }

    queueMicrotask(() => {
      if (isCancelled) {
        return
      }

      setSelectedExercises((current) => {
        if (current.some((exercise) => exercise.key === createdModel.profileId)) {
          return current
        }

        return [
          ...current,
          {
            key: createdModel.profileId,
            name: getModelDisplayName(t, createdModel),
            catalogExerciseId: createdModel.catalogExerciseId,
            measurementType: createdModel.measurementType,
          },
        ]
      })
      setKeyword('')
      setCategoryId(createdModel.categoryId)
      setIsCartOpen(true)
      navigate(`${location.pathname}${location.search}${location.hash}`, { replace: true })
    })

    return () => {
      isCancelled = true
    }
  }, [exerciseModels, location.hash, location.pathname, location.search, location.state, navigate, t])

  const normalizedKeyword = normalizeKeyword(keyword)
  const selectedModelIds = useMemo(
    () =>
      new Set(
        selectedExercises
          .map((exercise) => exercise.key),
      ),
    [selectedExercises],
  )
  const matchedCatalogIds = useMemo(() => {
    if (!normalizedKeyword) {
      return null
    }

    return new Set(findExerciseNameSuggestions(keyword, t, exerciseModels.length).map((exercise) => exercise.id))
  }, [exerciseModels.length, keyword, normalizedKeyword, t])
  const filteredExerciseModels = useMemo(
    () =>
      exerciseModels.filter((model) => {
        const displayName = getModelDisplayName(t, model)
        const searchValues = [
          displayName,
          model.catalogExerciseId ? getExerciseName(t, model.catalogExerciseId) : '',
          ...(model.catalogExerciseId ? getExerciseAliases(t, model.catalogExerciseId) : []),
          getMovementPatternName(t, model.movementPattern),
          model.categoryId === 'other'
            ? t('summary.analytics.otherDistribution')
            : getMuscleGroupName(t, model.categoryId),
        ]
        const matchesKeyword = normalizedKeyword
          ? searchValues.some((value) => normalizeKeyword(value).includes(normalizedKeyword))
            || (model.catalogExerciseId ? matchedCatalogIds?.has(model.catalogExerciseId) : false)
          : true
        const matchesCategory = Boolean(normalizedKeyword) || categoryId === 'all' || model.categoryId === categoryId

        return matchesKeyword && matchesCategory
      }),
    [categoryId, exerciseModels, matchedCatalogIds, normalizedKeyword, t],
  )
  const customName = keyword.trim()
  const canCreateCustom = customName.length > 0 && filteredExerciseModels.length === 0
  const categoryItems = useMemo(
    () => [
      { id: 'all' as const, label: t('exercisePicker.allCategory') },
      ...muscleGroups.map((groupId) => ({
        id: groupId,
        label: getMuscleGroupName(t, groupId),
      })),
      { id: 'other' as const, label: t('summary.analytics.otherDistribution') },
    ],
    [t],
  )
  const selectedCountByCategory = useMemo(() => {
    const counts: Record<PickerCategory, number> = {
      all: selectedExercises.length,
      chest: 0,
      back: 0,
      shoulders: 0,
      arms: 0,
      core: 0,
      legs: 0,
      fullBody: 0,
      other: 0,
    }

    selectedExercises.forEach((selectedExercise) => {
      const model = exerciseModels.find((item) => item.profileId === selectedExercise.key)
      if (!model) {
        return
      }

      counts[model.categoryId] += 1
    })

    return counts
  }, [exerciseModels, selectedExercises])

  function toggleExerciseModel(model: ExerciseModelOption) {
    if (selectedModelIds.has(model.profileId)) {
      setSelectedExercises((current) =>
        current.filter((exercise) => exercise.key !== model.profileId),
      )
      return
    }

    setSelectedExercises((current) => [
      ...current,
      {
        key: model.profileId,
        name: getModelDisplayName(t, model),
        catalogExerciseId: model.catalogExerciseId,
        measurementType: model.measurementType,
      },
    ])
  }

  function removeSelectedExercise(key: string) {
    setSelectedExercises((current) => current.filter((exercise) => exercise.key !== key))
  }

  function openExerciseModelEditor() {
    if (!customName) {
      return
    }

    navigate('/summary/exercises/catalog/new', {
      state: {
        ...backLinkState,
        exerciseModelName: customName,
        exercisePickerSelectedExercises: selectedExercises,
      },
    })
  }

  async function submitSelected(forceContinue = false) {
    if (selectedExercises.length === 0) {
      return
    }

    try {
      setIsSubmitting(true)
      setError(null)
      const inputs = selectedExercises.map((exercise) => ({
        name: exercise.name,
        catalogExerciseId: exercise.catalogExerciseId,
        measurementType: exercise.measurementType,
      }))

      if (target === 'plan') {
        if (!planId) {
          setError(t('exercisePicker.missingPlan'))
          return
        }

        const plans = await listPlansWithExercises()
        if (!plans.some((plan) => plan.id === planId)) {
          setError(t('exercisePicker.missingPlan'))
          return
        }

        const createdExercises = await createPlanExercises(planId, inputs)
        void triggerHaptic('success')
        navigate('/plans', {
          state: {
            selectedPlanId: planId,
            addedExerciseIds: createdExercises.map((exercise) => exercise.id),
          },
        })
        return
      }

      const session = await getOrCreateTodaySession()
      if (session.status === 'completed' && !forceContinue) {
        setIsContinueDialogOpen(true)
        return
      }

      const createdItems = await addTemporarySessionPlanItems(session.id, inputs)
      void triggerHaptic('success')
      navigate('/', {
        state: {
          addedExerciseIds: createdItems.map((exercise) => exercise.id),
        },
      })
    } catch (submitError) {
      console.error(submitError)
      setError(t('exercisePicker.createFailed'))
      void triggerHaptic('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 select-none flex-col overflow-hidden">
      <PageHeader title={t('exercisePicker.title')} backFallbackTo={target === 'plan' ? '/plans' : '/'} />

      <div className="shrink-0 pb-3">
        <label className="flex h-10 items-center gap-2.5 rounded-full bg-[var(--surface-container)] px-3.5 text-[var(--on-surface-variant)]">
          <Search size={17} strokeWidth={2.25} aria-hidden="true" />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder={t('exercisePicker.searchPlaceholder')}
            className="min-w-0 flex-1 select-text bg-transparent text-sm text-[var(--on-surface)] outline-none placeholder:text-[var(--on-surface-variant)]"
          />
        </label>
      </div>

      {error ? (
        <div className="mb-3 rounded-xl bg-[var(--error-container)] px-4 py-3 text-sm text-[var(--on-error-container)]">
          {error}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden rounded-t-2xl border-t border-[var(--outline-variant)] bg-[var(--surface-container)]">
        <div className="flex h-full min-h-0">
          <nav className="h-full w-[5.75rem] shrink-0 overflow-y-auto bg-[var(--surface-container)] py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categoryItems.map((category) => {
              const active = categoryId === category.id
              const count = selectedCountByCategory[category.id]

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setCategoryId(category.id)}
                  className={`relative flex min-h-12 w-full items-center gap-1.5 px-2.5 py-2 text-left text-xs font-medium transition-colors ${
                    active
                      ? 'bg-[var(--surface)] text-[var(--primary)]'
                      : 'text-[var(--on-surface-variant)]'
                  }`}
                >
                  {active ? (
                    <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-[var(--primary)]" />
                  ) : null}
                  <span className="min-w-0 flex-1 leading-4">{category.label}</span>
                  {category.id !== 'all' && count > 0 ? (
                    <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-[10px] font-semibold leading-none text-[var(--on-primary)]">
                      {count}
                    </span>
                  ) : null}
                </button>
              )
            })}
            <button
              type="button"
              onClick={() =>
                navigate('/summary/exercises/catalog/new', {
                  state: {
                    ...backLinkState,
                    exercisePickerSelectedExercises: selectedExercises,
                  },
                })
              }
              className="relative mt-1 flex min-h-12 w-full items-center gap-1.5 border-t border-[var(--outline-variant)]/40 px-2.5 py-2 text-left text-xs font-medium text-[var(--primary)] transition-colors"
            >
              <span className="min-w-0 flex-1 leading-4">{t('summary.exerciseRecords.addCustomTitle')}</span>
            </button>
          </nav>

          <div className="min-w-0 flex-1 bg-[var(--surface)]">
            <div className="h-full overflow-y-auto px-3 pb-[6.5rem] pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {canCreateCustom ? (
            <button
              type="button"
              onClick={openExerciseModelEditor}
              className="mb-2 flex min-h-[3.75rem] w-full items-center gap-3 rounded-xl border border-dashed border-[var(--outline)] px-3 text-left text-[var(--primary)]"
            >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)]">
                    <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {t('exercisePicker.addCustom', { name: customName })}
                  </span>
                </button>
              ) : null}

              <div className="divide-y divide-[var(--outline-variant)]">
                {filteredExerciseModels.map((model) => {
                  const selected = selectedModelIds.has(model.profileId)
                  const name = getModelDisplayName(t, model)

                  return (
                    <button
                      key={model.profileId}
                      type="button"
                      onClick={() => toggleExerciseModel(model)}
                      className="flex min-h-[3.75rem] w-full items-center gap-3 py-2.5 text-left"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold leading-5 text-[var(--on-surface)]">
                          {name}
                        </span>
                        <span className="mt-0.5 block truncate text-xs leading-4 text-[var(--on-surface-variant)]">
                          {formatExerciseMeta(t, model)}
                        </span>
                      </span>
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors ${
                          selected
                            ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)]'
                            : 'border-[var(--outline)] text-[var(--primary)]'
                        }`}
                        aria-hidden="true"
                      >
                        {selected ? (
                          <Check size={17} strokeWidth={3} />
                        ) : (
                          <Plus size={18} strokeWidth={2.6} />
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>

              {!canCreateCustom && filteredExerciseModels.length === 0 ? (
                <p className="py-8 text-center text-sm text-[var(--on-surface-variant)]">
                  {t('exercisePicker.noResults')}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-[30rem] px-4">
        <div
          className={`flex h-14 items-center gap-3 rounded-full border px-3 shadow-lg ${
            selectedExercises.length > 0
              ? 'border-[var(--outline-variant)] bg-[var(--surface-container-high)]'
              : 'border-[var(--outline-variant)] bg-[var(--surface-container)] opacity-70'
          }`}
        >
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)] disabled:bg-[var(--outline-variant)] disabled:text-[var(--on-surface-variant)]"
            disabled={selectedExercises.length === 0}
            aria-label={t('exercisePicker.openCart')}
          >
            <ShoppingBasket size={20} strokeWidth={2.35} aria-hidden="true" />
            {selectedExercises.length > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--error)] px-1 text-[10px] font-bold leading-none text-[var(--on-error)]">
                {selectedExercises.length}
              </span>
            ) : null}
          </button>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            disabled={selectedExercises.length === 0}
            className="min-w-0 flex-1 truncate text-left text-sm font-semibold text-[var(--on-surface)] disabled:text-[var(--on-surface-variant)]"
          >
            {t('exercisePicker.cartSummary', { count: selectedExercises.length })}
          </button>
          <button
            type="button"
            disabled={selectedExercises.length === 0 || isSubmitting}
            onClick={() => void submitSelected()}
            className="h-10 shrink-0 rounded-full bg-[var(--primary)] px-4 text-sm font-semibold text-[var(--on-primary)] disabled:bg-[var(--outline-variant)] disabled:text-[var(--on-surface-variant)]"
          >
            {t('exercisePicker.confirm')}
          </button>
        </div>
      </div>

      <BottomSheet
        open={isCartOpen}
        title={t('exercisePicker.cartTitle')}
        onClose={() => setIsCartOpen(false)}
      >
        <div>
          {selectedExercises.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--on-surface-variant)]">
              {t('exercisePicker.cartEmpty')}
            </p>
          ) : (
            <div className="max-h-[48vh] space-y-2 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {selectedExercises.map((exercise) => (
                <div
                  key={exercise.key}
                  className="flex min-h-12 items-center gap-3 rounded-xl bg-[var(--surface)] px-3"
                >
                  <span className="min-w-0 flex-1 truncate text-base text-[var(--on-surface)]">
                    {exercise.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelectedExercise(exercise.key)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]"
                    aria-label={t('exercisePicker.removeSelected', { name: exercise.name })}
                  >
                    <X size={18} strokeWidth={2.3} aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          )}

        </div>
      </BottomSheet>

      <ConfirmDialog
        open={isContinueDialogOpen}
        title={t('schedule.continueTodayTitle')}
        description={t('schedule.willUpdateSummary')}
        confirmLabel={t('common.continue')}
        onCancel={() => setIsContinueDialogOpen(false)}
        onConfirm={() => {
          setIsContinueDialogOpen(false)
          void submitSelected(true)
        }}
      />
    </div>
  )
}
