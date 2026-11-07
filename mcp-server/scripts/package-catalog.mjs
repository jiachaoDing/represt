import { readFile, writeFile } from 'node:fs/promises'
import ts from 'typescript'
import vm from 'node:vm'
import { createRequire } from 'node:module'

// Package the application's authoritative catalog; the service has no browser/i18n dependency.
const source = await readFile(new URL('../../src/domain/exercise-catalog/exercises.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } })
const module = { exports: {} }
vm.runInNewContext(outputText, { module, exports: module.exports, require: createRequire(new URL('../../src/domain/exercise-catalog/exercises.ts', import.meta.url)) })
const { exercises } = module.exports
const catalog = exercises.map(({ id, measurementType, muscleDistribution, loadMode }) => ({ id, measurementType, muscleDistribution, loadMode }))
await writeFile(new URL('../src/catalog.json', import.meta.url), JSON.stringify(catalog) + '\n', 'utf8')
