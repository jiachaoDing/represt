import { readFile, writeFile } from 'node:fs/promises'
import ts from 'typescript'

// Package the application's authoritative catalog; the service has no browser/i18n dependency.
const source = await readFile(new URL('../../src/domain/exercise-catalog/exercises.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } })
const { exercises } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`)
const catalog = exercises.map(({ id, measurementType, muscleDistribution }) => ({ id, measurementType, muscleDistribution }))
await writeFile(new URL('../src/catalog.json', import.meta.url), JSON.stringify(catalog) + '\n', 'utf8')
