import { useTranslation } from 'react-i18next'
import { loadModes, type ExerciseMetadata } from '../../domain/exercise-catalog'
import generated from '../../domain/exercise-catalog/generated.json'
import { getDetailedMuscleName } from '../../lib/exercise-catalog-i18n'

export function ExerciseMetadataFields({ value, onChange }: { value: ExerciseMetadata; onChange: (value: ExerciseMetadata) => void }) {
  const { t } = useTranslation()
  const update = (patch: Partial<ExerciseMetadata>) => onChange({ ...value, ...patch })
  const selectClass = 'w-full rounded-xl bg-[var(--surface-container)] p-3 text-[var(--on-surface)]'
  const defaults = value.trainingDefaults ?? {}
  const setDefault = (key: 'targetSets' | 'restSeconds' | 'weightIncrementKg', text: string) => update({ trainingDefaults: { ...defaults, [key]: text === '' ? key === 'weightIncrementKg' ? null : undefined : Number(text) } })
  return <div className="space-y-4">
    <div className="grid grid-cols-2 gap-3">
      <label className="space-y-2"><span>{t('catalog.primaryEquipment')}</span><select className={selectClass} value={value.primaryEquipment ?? ''} onChange={(event) => update({ primaryEquipment: event.target.value || null })}><option value="">{t('catalog.noDefault')}</option>{Object.entries(generated.equipmentNames).map(([id, name]) => <option value={id} key={id}>{t(`catalog.equipment.${id}`, { defaultValue: name })}</option>)}</select></label>
      {(['mechanic', 'laterality', 'loadMode'] as const).map((field) => <label className="space-y-2" key={field}><span>{t(`catalog.${field}`)}</span><select className={selectClass} value={value[field] ?? ''} onChange={(event) => update({ [field]: event.target.value || undefined })}><option value="">{t('catalog.noDefault')}</option>{(field === 'mechanic' ? ['compound', 'isolation'] : field === 'laterality' ? ['bilateral', 'unilateral', 'alternating'] : loadModes).map((id) => <option value={id} key={id}>{t(`catalog.${id}`)}</option>)}</select></label>)}
    </div>
    <label className="block space-y-2"><span>{t('catalog.setup')}</span><select multiple size={4} className={selectClass} value={value.setup ?? []} onChange={(event) => update({ setup: [...event.target.selectedOptions].map((option) => option.value) })}>{Object.entries(generated.equipmentNames).map(([id, name]) => <option value={id} key={id}>{t(`catalog.equipment.${id}`, { defaultValue: name })}</option>)}</select></label>
    <div className="grid grid-cols-2 gap-3">{(['primary', 'secondary'] as const).map((role) => <label className="space-y-2" key={role}><span>{t(role === 'primary' ? 'catalog.primaryMuscles' : 'catalog.secondaryMuscles')}</span><select multiple size={5} className={selectClass} value={value.muscles?.filter((muscle) => muscle.role === role).map((muscle) => muscle.id) ?? []} onChange={(event) => {
      const ids = [...event.target.selectedOptions].map((option) => option.value)
      update({ muscles: [...value.muscles?.filter((muscle) => muscle.role !== role && !ids.includes(muscle.id)) ?? [], ...ids.map((id) => ({ id, role }))] })
    }}>{generated.muscles.map((node) => <option value={node.id} key={node.id}>{getDetailedMuscleName(t, node.id)}</option>)}</select></label>)}</div>
    <h2 className="font-semibold">{t('catalog.defaults')}</h2>
    <div className="grid grid-cols-2 gap-3">{(['targetSets', 'restSeconds', 'weightIncrementKg'] as const).map((key) => <label key={key} className="space-y-2"><span>{t(key === 'targetSets' ? 'catalog.sets' : key === 'restSeconds' ? 'catalog.rest' : 'catalog.incrementKg')}</span><input type="number" min={key === 'targetSets' ? 1 : 0} step={key === 'weightIncrementKg' ? 'any' : 1} value={defaults[key] ?? ''} className={selectClass} onChange={(event) => setDefault(key, event.target.value)} /></label>)}
      {(['min', 'max'] as const).map((key) => <label key={key} className="space-y-2"><span>{t(key === 'min' ? 'catalog.repsMin' : 'catalog.repsMax')}</span><input type="number" min={1} step={1} value={defaults.repsRange?.[key] ?? ''} className={selectClass} onChange={(event) => update({ trainingDefaults: { ...defaults, repsRange: event.target.value === '' ? null : { min: defaults.repsRange?.min ?? 1, max: defaults.repsRange?.max ?? 1, [key]: Number(event.target.value) } } })} /></label>)}
    </div>
  </div>
}
