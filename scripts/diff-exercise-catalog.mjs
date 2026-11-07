import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const base = process.argv[2] ?? 'HEAD'
const root = 'src/domain/exercise-catalog/'
const read = (file) => JSON.parse(readFileSync(root + file, 'utf8'))
const previous = (file, fallback) => {
  try { return JSON.parse(execFileSync('git', ['show', `${base}:${root}${file}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })) }
  catch { return fallback }
}
// Verify the revision separately so a typo cannot look like an empty catalog.
execFileSync('git', ['rev-parse', '--verify', `${base}^{commit}`], { stdio: 'ignore' })
const legacy = read('legacy-v21.json').catalog
function entries(data, names, guides) {
  return new Map([...legacy.map((item) => ({ ...item, ...data.metadata?.[item.id] })), ...data.additions ?? []]
    .map((item) => [item.id, { ...item, names: Object.fromEntries(Object.entries(names).map(([locale, values]) => [locale, values[item.id]])), guide: guides[item.id], aliases: data.aliases?.[item.id] }]))
}
const data = read('generated.json')
const before = entries(previous('generated.json', {}), previous('names.json', {}), previous('guides-en.json', {}))
const after = entries(data, read('names.json'), read('guides-en.json'))
const changed = []
for (const [id, item] of after) {
  const old = before.get(id)
  if (!old) continue
  const fields = [...new Set([...Object.keys(old), ...Object.keys(item)])]
    .filter((field) => JSON.stringify(old[field]) !== JSON.stringify(item[field]))
  if (fields.length) changed.push({ id, fields })
}
console.log(JSON.stringify({ base, version: data.version,
  added: [...after.keys()].filter((id) => !before.has(id)),
  removed: [...before.keys()].filter((id) => !after.has(id)), changed,
}, null, 2))
