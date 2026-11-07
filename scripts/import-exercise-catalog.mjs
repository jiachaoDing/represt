import { readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'

const selection = JSON.parse(readFileSync('tools/exercise-catalog-editor/upstream-selection.json', 'utf8'))
const path = process.argv[2] ?? 'tmp/openexercisedb.db'
if (createHash('sha256').update(readFileSync(path)).digest('hex') !== selection.sha256) throw new Error('Upstream checksum mismatch')
const db = new DatabaseSync(path, { readOnly: true })
const all = db.prepare('SELECT * FROM exercises').all()
const byId = new Map(all.map((row) => [row.id, row]))
const groupMap = { chest: 'chest', back: 'back', lower_back: 'back', shoulders: 'shoulders', biceps: 'arms', triceps: 'arms', forearms: 'arms', abs: 'core', glutes: 'legs', quads: 'legs', hamstrings: 'legs', adductors: 'legs', calves: 'legs' }
const muscleRows = db.prepare('SELECT * FROM muscles').all()
const muscleById = new Map(muscleRows.map((row) => [row.id, row]))
const muscleNames = new Map(db.prepare("SELECT muscle_id,name FROM muscle_translations WHERE language_code='en'").all().map((row) => [row.muscle_id, row.name]))
const equipmentNames = Object.fromEntries(db.prepare("SELECT equipment_id,name FROM equipment_translations WHERE language_code='en'").all().map((row) => [row.equipment_id, row.name]))
const texts = db.prepare("SELECT * FROM exercise_translations WHERE language_code='en'")
const jsonArray = (value) => value ? JSON.parse(value) : []
const plain = (value) => (value ?? '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim()
const names = { en: {}, 'zh-CN': {} }, aliases = {}, guides = {}, metadata = {}, additions = []
const pending = []
const legacy = JSON.parse(readFileSync('src/domain/exercise-catalog/legacy-v21.json', 'utf8'))
for (const [localId, sourceId] of [...Object.entries(selection.existing), ...Object.keys(selection.additions).map((id) => [`oedb:${id}`, id]), ...selection.variants.map((variant) => [variant.id, variant.sourceId])]) {
  const variant = selection.variants.find((item) => item.id === localId)
  const source = byId.get(sourceId)
  if (!source || source.status !== 'active') throw new Error(`Invalid active upstream ID ${sourceId}`)
  const text = texts.all().find((row) => row.exercise_id === sourceId)
  const muscles = db.prepare('SELECT muscle_id,role FROM exercise_muscles WHERE exercise_id=?').all(sourceId).map((row) => ({ id: row.muscle_id, role: row.role }))
  const setup = db.prepare("SELECT equipment_id FROM exercise_equipment WHERE exercise_id=? AND kind='setup'").all(sourceId).map((row) => row.equipment_id)
  const provenance = [{ source: 'OpenExerciseDB', sourceId, version: selection.version, license: 'CC-BY-SA-4.0', author: source.upstream_license_author ?? '', url: `https://github.com/rfivesix/OpenExerciseDB/blob/${selection.commit}/data/exercises/${sourceId}.yaml`, modified: true }]
  if (text) provenance.push({ source: 'OpenExerciseDB / wger text', sourceId: text.id, version: selection.version, license: text.license ?? 'CC-BY-SA-4.0', author: text.license_author ?? '', url: `https://github.com/rfivesix/OpenExerciseDB/blob/${selection.commit}/data/i18n/en/${sourceId}.yaml`, modified: true })
  const meta = { muscles, primaryEquipment: source.primary_equipment, setup, mechanic: source.mechanic, laterality: source.laterality, movementPattern: source.movement_pattern ?? 'unspecified', loadMode: source.load_mode, provenance }
  guides[localId] = { description: plain(text?.description), instructions: jsonArray(text?.instructions).map(plain), cues: jsonArray(text?.cues).map(plain), commonMistakes: jsonArray(text?.common_mistakes).map(plain) }
  aliases[localId] = jsonArray(text?.search_terms)
  if (!localId.startsWith('oedb:')) { metadata[localId] = meta; continue }
  const measurementType = variant?.measurementType ?? { weight_reps: 'weightReps', bodyweight_reps: source.load_mode === 'assisted' ? 'weightReps' : 'reps', time: 'duration', distance_only: 'distance' }[source.tracking_type]
  if (!measurementType) { pending.push({ id: sourceId, reason: source.tracking_type }); continue }
  const groups = [...new Set(muscles.filter((m) => m.role === 'primary').map((m) => groupMap[muscleById.get(m.id)?.group_id]).filter(Boolean))]
  additions.push({ id: localId, slug: `oedb-${source.slug}${variant ? '-weighted' : ''}`, ...meta, measurementType, sourceUrls: [provenance[0].url], muscleDistribution: groups.map((muscleGroupId) => ({ muscleGroupId, ratio: 1 / groups.length })) })
  names.en[localId] = variant?.name ?? text.name
  names['zh-CN'][localId] = variant?.zhName ?? selection.additions[sourceId]
}
const localMetadata = JSON.parse(readFileSync('tools/exercise-catalog-editor/local-metadata.json', 'utf8'))
Object.assign(metadata, localMetadata)
for (const exercise of additions) Object.assign(exercise, localMetadata[exercise.id] ?? {})
for (const [id, exercise] of Object.entries(localMetadata)) {
  if (!legacy.catalog.some((entry) => entry.id === id) && !additions.some((entry) => entry.id === id) && exercise.slug && exercise.measurementType) additions.push({ ...exercise, id })
}
const output = { version: selection.version, sourceCommit: selection.commit, sha256: selection.sha256, metadata, additions, aliases, muscles: muscleRows.map((row) => ({ id: row.id, parentId: row.parent_id, group: groupMap[row.group_id] ?? 'other', name: muscleNames.get(row.id) ?? row.id })), equipmentNames }
const write = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n', 'utf8')
write('src/domain/exercise-catalog/generated.json', output)
write('src/domain/exercise-catalog/guides-en.json', guides)
write('src/domain/exercise-catalog/names.json', names)
write('tools/exercise-catalog-editor/import-report.json', { version: selection.version, added: additions.map((x) => x.id), unsupported: all.filter((x) => x.status === 'active' && ['time_weight', 'distance_time'].includes(x.tracking_type)).map((x) => ({ id: x.id, reason: x.tracking_type })), pending, unmappedLegacy: legacy.catalog.filter((x) => !selection.existing[x.id]).map((x) => x.id), duplicateCandidates: ['legPress / legPressMachine'] })
writeFileSync('src/domain/exercise-catalog/ATTRIBUTION.md', '# 动作数据来源\n\n| 数据 | 许可与修改 |\n| --- | --- |\n| OpenExerciseDB ' + selection.version + ' | CC BY-SA 4.0；已转换分类、翻译新增名称并保留 RepRest 旧标识 |\n| 上游提交 | ' + selection.commit + ' |\n\n来源：https://github.com/rfivesix/OpenExerciseDB 。逐条作者、原始许可和文本来源保存在 generated.json 的 provenance 中。衍生动作数据以 CC BY-SA 4.0 发布，应用代码许可见仓库 LICENSE。完整许可：https://creativecommons.org/licenses/by-sa/4.0/ 。\n', 'utf8')
console.log(`Enriched ${legacy.catalog.length} legacy entries (${Object.keys(selection.existing).length} upstream mappings) and imported ${additions.length} additions.`)
