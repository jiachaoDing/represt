import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Copy, EyeOff, RotateCcw, Undo2, Edit3 } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { getExerciseDefinition, copyExerciseDefinition, setExerciseHidden, resetLegacyExerciseOverride, type ExerciseDefinition } from '../db/exercise-models'
import { getDefinitionName } from '../lib/exercise-search'
import { getMovementPatternName, getDetailedMuscleName } from '../lib/exercise-catalog-i18n'
import { getTrainingDefaults, type ExerciseGuide } from '../domain/exercise-catalog'
import { formatWeightIncrement } from '../lib/weight-units'
import generated from '../domain/exercise-catalog/generated.json'

export function ExerciseGuidePage() {
  const { profileId = '' } = useParams()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [definition, setDefinition] = useState<ExerciseDefinition | null>(null)
  const [guide, setGuide] = useState<ExerciseGuide>({})
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let cancelled = false
    void Promise.all([getExerciseDefinition(profileId), import('../domain/exercise-catalog/guides-en.json')]).then(([item, texts]) => {
      if (cancelled) return
      setDefinition(item)
      setGuide(item?.notes ? { description: item.notes } : (texts.default as Record<string, ExerciseGuide>)[item?.catalogExerciseId ?? ''] ?? {})
    }).catch(() => { if (!cancelled) setError(true) })
    return () => { cancelled = true }
  }, [profileId])
  const name = definition ? getDefinitionName(t, definition) : t('catalog.guide')
  const defaults = getTrainingDefaults(definition ?? {})
  const run = async (action: () => Promise<unknown>) => {
    try { setBusy(true); await action(); setDefinition(await getExerciseDefinition(profileId)) }
    catch { setError(true) } finally { setBusy(false) }
  }
  const section = (title: string, lines?: string[]) => lines?.length ? <section className="rounded-2xl bg-[var(--surface-container)] p-4"><h2 className="mb-2 font-semibold">{title}</h2><ol className="list-inside list-decimal space-y-2 leading-7">{lines.map((line, index) => <li key={index}>{line}</li>)}</ol></section> : null
  return <div className="pb-8 text-[var(--on-surface)]">
    <PageHeader title={name} backFallbackTo="/summary/exercises" />
    {error && <p role="alert" className="m-4 text-[var(--error)]">{t('catalog.failed')}</p>}
    {definition && <div className="mx-4 space-y-4">
      <div className="flex items-center gap-2 text-sm text-[var(--on-surface-variant)]"><span>{t(definition.legacyOverride ? 'catalog.legacy' : definition.readOnly ? 'catalog.builtin' : 'catalog.custom')}</span><span>·</span><span>{getMovementPatternName(t, definition.movementPattern)}</span></div>
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} aria-label={t('catalog.copy')} className="rounded-full bg-[var(--primary-container)] p-3 text-[var(--on-primary-container)]" onClick={() => void run(async () => {
          const id = await copyExerciseDefinition(profileId, t('catalog.copyName', { name }))
          if (id) navigate(`/summary/exercises/catalog/${encodeURIComponent(`change:${id}`)}`)
        })}><Copy size={20} /></button>
        {!definition.readOnly && <button aria-label={t('summary.exerciseRecords.editModel')} className="rounded-full bg-[var(--surface-container)] p-3" onClick={() => navigate(`/summary/exercises/catalog/${encodeURIComponent(`change:${profileId}`)}`)}><Edit3 size={20} /></button>}
        <button disabled={busy} aria-label={t(definition.hidden ? 'catalog.restore' : 'catalog.hide')} className="rounded-full bg-[var(--surface-container)] p-3" onClick={() => void run(() => setExerciseHidden(profileId, !definition.hidden))}>{definition.hidden ? <Undo2 size={20} /> : <EyeOff size={20} />}</button>
        {definition.legacyOverride && <button disabled={busy} aria-label={t('catalog.reset')} className="rounded-full bg-[var(--surface-container)] p-3" onClick={() => void run(() => resetLegacyExerciseOverride(profileId))}><RotateCcw size={20} /></button>}
      </div>
      {definition.readOnly && <p className="text-sm text-[var(--on-surface-variant)]">{t('catalog.readOnly')}</p>}
      <dl className="grid grid-cols-2 gap-3 rounded-2xl bg-[var(--surface-container)] p-4 text-sm">
        {['primaryEquipment', 'mechanic', 'laterality', 'loadMode'].map((field) => {
          const value = definition[field as 'primaryEquipment' | 'mechanic' | 'laterality' | 'loadMode']
          return <div key={field}><dt className="text-[var(--on-surface-variant)]">{t(`catalog.${field}`)}</dt><dd className="mt-1">{value ? t(field === 'primaryEquipment' ? `catalog.equipment.${value}` : `catalog.${value}`, { defaultValue: (generated.equipmentNames as Record<string, string>)[value] ?? value }) : t('catalog.noDefault')}</dd></div>
        })}
        {definition.setup?.length ? <div className="col-span-2"><dt>{t('catalog.setup')}</dt><dd>{definition.setup.map((id) => t(`catalog.equipment.${id}`, { defaultValue: (generated.equipmentNames as Record<string, string>)[id] ?? id })).join(' · ')}</dd></div> : null}
      </dl>
      {definition.muscles?.length ? <section className="rounded-2xl bg-[var(--surface-container)] p-4"><h2 className="font-semibold">{t('catalog.muscles')}</h2>{(['primary', 'secondary'] as const).map((role) => <p key={role} className="mt-2 text-sm">{t(`catalog.${role}`)}: {definition.muscles?.filter((muscle) => muscle.role === role).map((muscle) => getDetailedMuscleName(t, muscle.id)).join(' · ') || t('catalog.unclassified')}</p>)}</section> : null}
      <section className="rounded-2xl bg-[var(--surface-container)] p-4"><h2 className="font-semibold">{t('catalog.defaults')}</h2><p className="mt-2 text-sm">{t('catalog.repsRange')}: {['reps', 'weightReps', 'leftRightWeightReps', 'durationReps'].includes(definition.measurementType) && defaults.repsRange ? `${defaults.repsRange.min}–${defaults.repsRange.max}` : t('catalog.noDefault')}</p><p className="mt-2 text-sm">{t('catalog.increment')}: {defaults.weightIncrementKg != null ? formatWeightIncrement(defaults.weightIncrementKg, t) : t('catalog.noDefault')}</p></section>
      {!definition.notes && !i18n.resolvedLanguage?.startsWith('en') && (guide.description || guide.instructions?.length || guide.cues?.length || guide.commonMistakes?.length) ? <p className="text-sm text-[var(--on-surface-variant)]">{t('catalog.englishFallback')}</p> : null}
      {guide.description && <section className="rounded-2xl bg-[var(--surface-container)] p-4"><h2 className="mb-2 font-semibold">{t('catalog.description')}</h2><p className="whitespace-pre-line leading-7">{guide.description}</p></section>}
      {section(t('catalog.instructions'), guide.instructions)}{section(t('catalog.cues'), guide.cues)}{section(t('catalog.commonMistakes'), guide.commonMistakes)}
      {!guide.description && !guide.instructions?.length && <p>{t('catalog.noGuide')}</p>}
      {definition.provenance?.length ? <section className="break-words text-xs leading-6 text-[var(--on-surface-variant)]">
        <h2 className="font-semibold">{t('catalog.sources')}</h2>
        {definition.provenance.map((source, index) => <p key={index}>
          {source.url.startsWith('https://') ? <a className="underline" href={source.url} target="_blank" rel="noreferrer">{source.source} {source.sourceId}</a> : source.source}
          {' · '}{source.license} · {source.author} · {source.version}{source.modified ? ` · ${t('catalog.modified')}` : ''}
        </p>)}
        <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a>
      </section> : null}
    </div>}
  </div>
}
