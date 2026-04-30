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

function checkGroupAliases(errors, groupIds, ...resources) {
  for (const groupId of groupIds) {
    resources.forEach((resource, index) => {
      if (!Array.isArray(resource.groupAliases?.[groupId])) {
        errors.push(`MuscleGroup "${groupId}" is missing group aliases in resource ${index + 1}`)
      }
    })
  }
}

function checkMovementPatterns(errors, movementPatterns, ...resources) {
  for (const movementPattern of movementPatterns) {
    resources.forEach((resource, index) => {
      const label = `MovementPattern "${movementPattern}" in resource ${index + 1}`
      if (
        typeof resource.movementPatterns?.names?.[movementPattern] !== 'string' ||
        resource.movementPatterns.names[movementPattern].trim() === ''
      ) {
        errors.push(`${label} is missing name`)
      }
      if (
        typeof resource.movementPatterns?.descriptions?.[movementPattern] !== 'string' ||
        resource.movementPatterns.descriptions[movementPattern].trim() === ''
      ) {
        errors.push(`${label} is missing description`)
      }
      if (!Array.isArray(resource.movementPatterns?.aliases?.[movementPattern])) {
        errors.push(`${label} is missing aliases`)
      }
    })
  }
}

function checkNoCatalogAliases(errors, label, items) {
  for (const item of items) {
    if (Object.prototype.hasOwnProperty.call(item, 'aliases')) {
      errors.push(`${label} "${item.id}" should keep aliases in i18n resources`)
    }
  }
}

const { exercises } = loadTsModule('src/domain/exercise-catalog/exercises.ts')
const { muscleGroups } = loadTsModule('src/domain/exercise-catalog/muscles.ts')
const enExercises = loadTsModule('src/locales/en/exercises.ts').default
const zhCNExercises = loadTsModule('src/locales/zh-CN/exercises.ts').default
const enMuscles = loadTsModule('src/locales/en/muscles.ts').default
const zhCNMuscles = loadTsModule('src/locales/zh-CN/muscles.ts').default

const errors = []
const muscleGroupIds = readStringUnion('src/domain/exercise-catalog/types.ts', 'MuscleGroup')
const muscleGroupIdSet = new Set(muscleGroupIds)
const movementPatterns = readStringUnion('src/domain/exercise-catalog/types.ts', 'MovementPattern')
const movementPatternIds = new Set(movementPatterns)

checkNames(
  errors,
  'exercise',
  exercises.map((exercise) => exercise.id),
  enExercises,
  zhCNExercises,
)
checkGroupNames(errors, muscleGroupIds, enMuscles, zhCNMuscles)
checkGroupAliases(errors, muscleGroupIds, enMuscles, zhCNMuscles)
checkMovementPatterns(errors, movementPatterns, enExercises, zhCNExercises)
checkNoCatalogAliases(errors, 'exercise', exercises)

for (const muscleGroup of muscleGroups) {
  if (!muscleGroupIdSet.has(muscleGroup)) {
    errors.push(`Muscle group list references missing group "${muscleGroup}"`)
  }
}

for (const muscleGroupId of muscleGroupIds) {
  if (!muscleGroups.includes(muscleGroupId)) {
    errors.push(`Muscle group list is missing group "${muscleGroupId}"`)
  }
}

for (const exercise of exercises) {
  if (!movementPatternIds.has(exercise.movementPattern)) {
    errors.push(`Exercise "${exercise.id}" references missing movement pattern "${exercise.movementPattern}"`)
  }

  for (const muscleGroupId of [...exercise.primaryMuscleGroupIds, ...exercise.secondaryMuscleGroupIds]) {
    if (!muscleGroupIdSet.has(muscleGroupId)) {
      errors.push(`Exercise "${exercise.id}" references missing muscle group "${muscleGroupId}"`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('Exercise catalog i18n check passed.')
