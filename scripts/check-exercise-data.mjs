import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const json = (path) => JSON.parse(readFileSync(path, 'utf8'))
const root = 'src/domain/exercise-catalog/'
const generated = json(root + 'generated.json')
const legacy = json(root + 'legacy-v21.json')
const selection = json('tools/exercise-catalog-editor/upstream-selection.json')
const guides = json(root + 'guides-en.json')
const names = json(root + 'names.json')
assert.equal(generated.sha256, selection.sha256)
assert.equal(generated.sourceCommit, selection.commit)
assert.equal(generated.version, selection.version)
const ids = new Set(legacy.catalog.map((exercise) => exercise.id))
const slugs = new Set(legacy.catalog.map((exercise) => exercise.slug))
const muscleIds = new Set(generated.muscles.map((node) => node.id))
for (const node of generated.muscles) assert(!node.parentId || muscleIds.has(node.parentId), `Missing muscle parent ${node.id}`)
for (const exercise of generated.additions) {
  assert(!ids.has(exercise.id), `Duplicate ID ${exercise.id}`); ids.add(exercise.id)
  assert(!slugs.has(exercise.slug), `Duplicate slug ${exercise.slug}`); slugs.add(exercise.slug)
  assert(['weightReps', 'reps', 'duration', 'distance', 'weightDistance', 'leftRightWeightReps', 'durationReps'].includes(exercise.measurementType))
  assert(exercise.provenance?.length, `Missing attribution ${exercise.id}`)
  for (const locale of ['en', 'zh-CN']) assert(names[locale][exercise.id]?.trim(), `Missing name ${locale}/${exercise.id}`)
  assert(Math.abs(exercise.muscleDistribution.reduce((sum, item) => sum + item.ratio, 0) - 1) < 1e-6, `Invalid distribution ${exercise.id}`)
}
for (const exercise of [...Object.values(generated.metadata), ...generated.additions]) {
  if (exercise.primaryEquipment) assert(Object.hasOwn(generated.equipmentNames, exercise.primaryEquipment), `Unknown equipment ${exercise.primaryEquipment}`)
  for (const id of exercise.setup ?? []) assert(Object.hasOwn(generated.equipmentNames, id), `Unknown setup ${id}`)
  for (const muscle of exercise.muscles ?? []) assert(muscleIds.has(muscle.id), `Unknown muscle ${muscle.id}`)
  if (exercise.loadMode) assert(['external', 'bodyweight', 'assisted', 'variable'].includes(exercise.loadMode))
}
for (const [id, guide] of Object.entries(guides)) {
  assert(ids.has(id), `Unlinked guide ${id}`)
  assert(!Object.hasOwn(guide, 'images'), 'Text-only guides')
}
console.log(`Exercise data check passed (${ids.size} exercises).`)
