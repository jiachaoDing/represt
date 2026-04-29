import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import ts from 'typescript'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadTsModule(relativePath) {
  const filePath = resolve(root, relativePath)
  const source = readFileSync(filePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  })
  const module = { exports: {} }
  vm.runInNewContext(transpiled.outputText, { exports: module.exports, module }, { filename: filePath })
  return module.exports
}

function readStringUnion(relativePath, typeName) {
  const filePath = resolve(root, relativePath)
  const sourceFile = ts.createSourceFile(
    filePath,
    readFileSync(filePath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  )

  for (const statement of sourceFile.statements) {
    if (ts.isTypeAliasDeclaration(statement) && statement.name.text === typeName) {
      return statement.type.types
        .filter((node) => ts.isLiteralTypeNode(node) && ts.isStringLiteral(node.literal))
        .map((node) => node.literal.text)
    }
  }

  throw new Error(`Cannot find string union type ${typeName}`)
}

function checkNames(errors, label, ids, ...resources) {
  for (const id of ids) {
    resources.forEach((resource, index) => {
      if (typeof resource.names?.[id] !== 'string' || resource.names[id].trim() === '') {
        errors.push(`${label} "${id}" is missing name in resource ${index + 1}`)
      }
    })
  }
}

function checkGroupNames(errors, groupIds, ...resources) {
  for (const groupId of groupIds) {
    resources.forEach((resource, index) => {
      if (typeof resource.groups?.[groupId] !== 'string' || resource.groups[groupId].trim() === '') {
        errors.push(`MuscleGroup "${groupId}" is missing group name in resource ${index + 1}`)
      }
    })
  }
}

const { exercises } = loadTsModule('src/domain/exercise-catalog/exercises.ts')
const { equipment } = loadTsModule('src/domain/exercise-catalog/equipment.ts')
const { muscles } = loadTsModule('src/domain/exercise-catalog/muscles.ts')
const enExercises = loadTsModule('src/locales/en/exercises.ts').default
const zhCNExercises = loadTsModule('src/locales/zh-CN/exercises.ts').default
const enEquipment = loadTsModule('src/locales/en/equipment.ts').default
const zhCNEquipment = loadTsModule('src/locales/zh-CN/equipment.ts').default
const enMuscles = loadTsModule('src/locales/en/muscles.ts').default
const zhCNMuscles = loadTsModule('src/locales/zh-CN/muscles.ts').default

const errors = []
const equipmentIds = new Set(equipment.map((item) => item.id))
const muscleIds = new Set(muscles.map((muscle) => muscle.id))
const muscleGroupIds = readStringUnion('src/domain/exercise-catalog/types.ts', 'MuscleGroup')

checkNames(errors, 'equipment', equipmentIds, enEquipment, zhCNEquipment)
checkNames(errors, 'muscle', muscleIds, enMuscles, zhCNMuscles)
checkNames(
  errors,
  'exercise',
  exercises.map((exercise) => exercise.id),
  enExercises,
  zhCNExercises,
)
checkGroupNames(errors, muscleGroupIds, enMuscles, zhCNMuscles)

for (const exercise of exercises) {
  for (const equipmentId of exercise.equipmentIds) {
    if (!equipmentIds.has(equipmentId)) {
      errors.push(`Exercise "${exercise.id}" references missing equipment "${equipmentId}"`)
    }
  }

  for (const muscleId of [...exercise.primaryMuscleIds, ...exercise.secondaryMuscleIds]) {
    if (!muscleIds.has(muscleId)) {
      errors.push(`Exercise "${exercise.id}" references missing muscle "${muscleId}"`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('Exercise catalog i18n check passed.')
