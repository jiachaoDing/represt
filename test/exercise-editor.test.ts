import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'
import { expect, it } from 'vitest'

it('preserves metadata and generated-name imports when the catalog editor round-trips project files', () => {
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
  const context = vm.createContext({ document: { querySelector: () => null, querySelectorAll: () => [] }, window: {}, structuredClone })
  const source = read('tools/exercise-catalog-editor/app.js').replace(/render\(\)\s*$/, '')
  vm.runInContext(source, context)
  context.generated = JSON.parse(read('src/domain/exercise-catalog/generated.json'))
  context.names = JSON.parse(read('src/domain/exercise-catalog/names.json'))
  context.catalogSource = read('src/domain/exercise-catalog/exercises.ts')
  context.localeSource = read('src/locales/en/exercises.ts')
  const result = vm.runInContext(`
    state.generatedData = generated
    state.generatedNames = names
    state.sourceFiles = { 'src/domain/exercise-catalog/exercises.ts': catalogSource }
    state.catalog.exercises = parseCatalogSource(catalogSource, 'exercises')
    state.i18n.en.exercises = parseLocaleSource(localeSource, 'exercises');
    ({ count: state.catalog.exercises.length,
       equipment: state.catalog.exercises.find((item) => item.id === 'oedb:1194').primaryEquipment,
       catalog: generateExport('src/domain/exercise-catalog/exercises.ts'),
       locale: generateExport('src/locales/en/exercises.ts') })
  `, context) as { count: number; equipment: string; catalog: string; locale: string }
  expect(result.count).toBe(126)
  expect(result.equipment).toBe('cable')
  expect(result.catalog).toBe(context.catalogSource)
  expect(result.locale).toContain('...generatedNames')
  const module = { exports: {} as { default?: { names: Record<string, string> } } }
  vm.runInNewContext(ts.transpileModule(result.locale, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText,
    { module, exports: module.exports, require: () => context.names })
  expect(module.exports.default?.names['oedb:475:weighted']).toBe('Weighted Pull-Up')
})
