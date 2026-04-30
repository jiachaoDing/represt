const initialData = {
  catalog: { exercises: [] },
  i18n: {
    en: {
      exercises: { names: {}, aliases: {}, movementPatterns: { names: {}, descriptions: {}, aliases: {} } },
      muscles: { groups: {}, groupAliases: {} },
    },
    'zh-CN': {
      exercises: { names: {}, aliases: {}, movementPatterns: { names: {}, descriptions: {}, aliases: {} } },
      muscles: { groups: {}, groupAliases: {} },
    },
  },
}

const measurementTypes = ['weightReps', 'reps', 'duration', 'distance', 'weightDistance']
const movementPatterns = ['push', 'pull', 'legs', 'core', 'fullBody', 'conditioning']
const defaultMuscleGroups = ['chest', 'back', 'shoulders', 'arms', 'core', 'legs', 'fullBody']
const exportPaths = [
  'src/domain/exercise-catalog/measurement-types.ts',
  'src/domain/exercise-catalog/movement-patterns.ts',
  'src/domain/exercise-catalog/muscles.ts',
  'src/domain/exercise-catalog/types.ts',
  'src/domain/exercise-catalog/exercises.ts',
  'src/locales/en/exercises.ts',
  'src/locales/zh-CN/exercises.ts',
  'src/locales/en/muscles.ts',
  'src/locales/zh-CN/muscles.ts',
]

const state = {
  activeTab: 'catalog',
  catalogPage: 'exercises',
  catalog: structuredClone(initialData.catalog),
  i18n: structuredClone(initialData.i18n),
  measurementTypes: [...measurementTypes],
  movementPatterns: [...movementPatterns],
  catalogSearch: '',
  measurementTypeSearch: '',
  movementPatternSearch: '',
  muscleSearch: '',
  muscleGroupSearch: '',
  muscleGroups: [...defaultMuscleGroups],
  editingExerciseId: null,
  editingMeasurementTypeId: null,
  editingMovementPatternId: null,
  editingMuscleGroupId: null,
  i18nNamespace: 'exercises',
  i18nLocaleView: 'both',
  i18nSearch: '',
  i18nFilter: 'all',
  exportPath: exportPaths[0],
  copyMessage: '',
  projectDirectoryHandle: null,
  syncMessage: 'No project folder selected.',
}

const app = document.querySelector('#app')

document.querySelectorAll('[data-tab]').forEach((button) => {
  button.addEventListener('click', () => {
    state.activeTab = button.dataset.tab
    render()
  })
})

function render() {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.setAttribute('aria-current', button.dataset.tab === state.activeTab ? 'page' : 'false')
  })

  if (state.activeTab === 'catalog') renderCatalog()
  if (state.activeTab === 'i18n') renderI18n()
  if (state.activeTab === 'validate') renderValidate()
  if (state.activeTab === 'sync') renderSync()
  if (state.activeTab === 'export') renderExport()
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function linesToArray(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function selectedValues(id) {
  return Array.from(document.querySelectorAll(`#${id} input[type="checkbox"]:checked`)).map((input) => input.value)
}

function arrayTextarea(value) {
  return escapeHtml((value || []).join('\n'))
}

function matchesSearch(values, search) {
  const keyword = search.trim().toLowerCase()
  if (!keyword) return true
  return values.flat().join(' ').toLowerCase().includes(keyword)
}

function renderCatalog() {
  if (state.catalogPage === 'measurementTypes') {
    renderMeasurementTypesCatalog()
    return
  }
  if (state.catalogPage === 'movementPatterns') {
    renderMovementPatternsCatalog()
    return
  }
  if (state.catalogPage === 'muscles') {
    renderMuscleGroupsCatalog()
    return
  }
  renderExercisesCatalog()
}

function renderCatalogPageNav() {
  const pages = [
    ['exercises', 'Exercises'],
    ['measurementTypes', 'Measurement Types'],
    ['movementPatterns', 'Movement Patterns'],
    ['muscles', 'Muscle Groups'],
  ]
  return `
    <nav aria-label="Catalog pages">
      <ul>
        ${pages
          .map(
            ([value, label]) => `
              <li>
                <button type="button" class="${state.catalogPage === value ? '' : 'secondary'}" onclick="setCatalogPage('${value}')">
                  ${label}
                </button>
              </li>
            `,
          )
          .join('')}
      </ul>
    </nav>
  `
}

function renderExercisesCatalog() {
  const filteredExercises = state.catalog.exercises.filter((exercise) =>
    matchesSearch(exerciseSearchValues(exercise), state.catalogSearch),
  )
  const editing = state.catalog.exercises.find((exercise) => exercise.id === state.editingExerciseId)

  app.innerHTML = `
    <section>
      ${renderCatalogPageNav()}
      <div class="toolbar">
        <label>
          Search exercises
          <input id="catalog-search" value="${escapeHtml(state.catalogSearch)}" placeholder="id, slug, i18n alias, muscle" />
        </label>
        <div>
          <button type="button" onclick="startNewExercise()">New exercise</button>
        </div>
      </div>
      <article>
        <h2>${editing ? 'Edit exercise' : 'New exercise'}</h2>
        ${renderExerciseForm(editing)}
      </article>
      <article>
        <h2>Exercises <span class="status-pill">${filteredExercises.length} / ${state.catalog.exercises.length}</span></h2>
        <div class="exercise-card-list">
          ${filteredExercises.length
            ? filteredExercises.map(renderExerciseCard).join('')
            : '<p class="muted">No exercises match the current search.</p>'}
        </div>
      </article>
    </section>
  `

  document.getElementById('catalog-search').addEventListener('input', (event) => {
    state.catalogSearch = event.target.value
    renderCatalog()
  })
  document.getElementById('exercise-form').addEventListener('submit', saveExercise)
}

function renderExerciseForm(exercise) {
  const value = exercise || {
    id: '',
    slug: '',
    measurementType: 'weightReps',
    movementPattern: state.movementPatterns[0],
    primaryMuscleGroupIds: [],
    secondaryMuscleGroupIds: [],
    sourceUrls: [],
  }

  return `
    <form id="exercise-form">
      <div class="form-grid">
        <label>
          id
          <input id="exercise-id" required value="${escapeHtml(value.id)}" />
        </label>
        <label>
          slug
          <input id="exercise-slug" required value="${escapeHtml(value.slug)}" />
        </label>
        <label>
          movementPattern
          <select id="exercise-movement-pattern">
            ${state.movementPatterns
              .map((type) => `<option value="${type}" ${type === value.movementPattern ? 'selected' : ''}>${type}</option>`)
              .join('')}
          </select>
        </label>
        <label>
          measurementType
          <select id="exercise-measurement-type">
            ${state.measurementTypes
              .map((type) => `<option value="${type}" ${type === value.measurementType ? 'selected' : ''}>${type}</option>`)
              .join('')}
          </select>
        </label>
      </div>
      <div class="form-grid">
        ${renderCheckboxMultiSelect('exercise-primary-muscle-group-ids', 'primaryMuscleGroupIds', state.muscleGroups, value.primaryMuscleGroupIds)}
        ${renderCheckboxMultiSelect('exercise-secondary-muscle-group-ids', 'secondaryMuscleGroupIds', state.muscleGroups, value.secondaryMuscleGroupIds)}
      </div>
      <div class="form-grid">
        <label>
          sourceUrls, one per line
          <textarea id="exercise-source-urls">${arrayTextarea(value.sourceUrls)}</textarea>
        </label>
      </div>
      <button type="submit">${exercise ? 'Save exercise' : 'Add exercise'}</button>
      <button type="button" class="secondary" onclick="startNewExercise()">Reset</button>
    </form>
  `
}

function renderCheckboxMultiSelect(id, label, items, selected) {
  const selectedSet = new Set(selected || [])
  return `
    <fieldset>
      <legend>${escapeHtml(label)}</legend>
      <div id="${id}" class="checkbox-list">
      ${items
        .map(
          (item) => {
            const itemId = typeof item === 'string' ? item : item.id
            return `
            <label>
              <input type="checkbox" value="${escapeHtml(itemId)}" ${selectedSet.has(itemId) ? 'checked' : ''} />
              <span>${escapeHtml(itemId)}</span>
            </label>
          `
          },
        )
        .join('')}
      </div>
    </fieldset>
  `
}

function renderExerciseCard(exercise) {
  return `
    <section class="exercise-card">
      <div class="exercise-card-header">
        <h3 class="exercise-card-title">${escapeHtml(exercise.id)}</h3>
        <div class="exercise-card-actions">
        <button type="button" class="secondary" onclick="editExercise('${escapeHtml(exercise.id)}')">Edit</button>
        <button type="button" class="contrast" onclick="deleteExercise('${escapeHtml(exercise.id)}')">Delete</button>
        </div>
      </div>
      <div class="exercise-card-grid">
        ${renderCardField('slug', [exercise.slug])}
        ${renderCardField('movementPattern', [exercise.movementPattern])}
        ${renderCardField('measurementType', [exercise.measurementType])}
        ${renderCardField('primaryMuscleGroupIds', exercise.primaryMuscleGroupIds)}
        ${renderCardField('secondaryMuscleGroupIds', exercise.secondaryMuscleGroupIds)}
        ${renderCardField('sourceUrls', exercise.sourceUrls)}
      </div>
    </section>
  `
}

function renderCardField(label, values) {
  const normalized = (values || []).filter(Boolean)
  return `
    <div>
      <span class="field-label">${escapeHtml(label)}</span>
      <div class="field-list">
        ${normalized.length
          ? normalized.map((value) => `<span class="chip">${escapeHtml(value)}</span>`).join('')
          : '<span class="muted">empty</span>'}
      </div>
    </div>
  `
}

function exerciseSearchValues(exercise) {
  const muscleGroupSearchValues = [...(exercise.primaryMuscleGroupIds || []), ...(exercise.secondaryMuscleGroupIds || [])].flatMap((id) => [
    id,
    state.i18n.en?.muscles?.groups?.[id] || '',
    state.i18n['zh-CN']?.muscles?.groups?.[id] || '',
    state.i18n.en?.muscles?.groupAliases?.[id] || [],
    state.i18n['zh-CN']?.muscles?.groupAliases?.[id] || [],
  ])
  const movementPatternSearchValues = [
    exercise.movementPattern,
    state.i18n.en?.exercises?.movementPatterns?.names?.[exercise.movementPattern] || '',
    state.i18n['zh-CN']?.exercises?.movementPatterns?.names?.[exercise.movementPattern] || '',
    state.i18n.en?.exercises?.movementPatterns?.descriptions?.[exercise.movementPattern] || '',
    state.i18n['zh-CN']?.exercises?.movementPatterns?.descriptions?.[exercise.movementPattern] || '',
    state.i18n.en?.exercises?.movementPatterns?.aliases?.[exercise.movementPattern] || [],
    state.i18n['zh-CN']?.exercises?.movementPatterns?.aliases?.[exercise.movementPattern] || [],
  ]
  return [
    exercise.id,
    exercise.slug,
    state.i18n.en?.exercises?.names?.[exercise.id] || '',
    state.i18n['zh-CN']?.exercises?.names?.[exercise.id] || '',
    muscleGroupSearchValues,
    movementPatternSearchValues,
    state.i18n.en?.exercises?.aliases?.[exercise.id] || [],
    state.i18n['zh-CN']?.exercises?.aliases?.[exercise.id] || [],
  ]
}

function renderMuscleGroupsCatalog() {
  app.innerHTML = `
    <section>
      ${renderCatalogPageNav()}
      ${renderMuscleGroupsSection()}
    </section>
  `

  document.getElementById('muscle-group-search').addEventListener('input', (event) => {
    state.muscleGroupSearch = event.target.value
    renderMuscleGroupsCatalog()
  })
  document.getElementById('muscle-group-form').addEventListener('submit', saveMuscleGroupCatalog)
}

function renderCompactTable(headers, rows, renderRow, emptyMessage) {
  if (!rows.length) return `<p class="muted">${escapeHtml(emptyMessage)}</p>`
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows.map(renderRow).join('')}
        </tbody>
      </table>
    </div>
  `
}

function renderMeasurementTypesCatalog() {
  const filteredTypes = state.measurementTypes.filter((id) => matchesSearch([id], state.measurementTypeSearch))
  app.innerHTML = `
    <section>
      ${renderCatalogPageNav()}
      <article>
        <h2>${state.editingMeasurementTypeId ? 'Edit measurement type' : 'New measurement type'}</h2>
        <div class="toolbar">
          <label>
            Search measurement types
            <input id="measurement-type-search" value="${escapeHtml(state.measurementTypeSearch)}" placeholder="id" />
          </label>
          <div>
            <button type="button" onclick="startNewMeasurementType()">New measurement type</button>
          </div>
        </div>
        ${renderIdForm('measurement-type-form', 'measurement-type-id', state.editingMeasurementTypeId, 'measurement type')}
        <h3>Measurement Types <span class="status-pill">${filteredTypes.length} / ${state.measurementTypes.length}</span></h3>
        ${renderCompactTable(
          ['id', 'used by exercises', 'Actions'],
          filteredTypes,
          renderMeasurementTypeRow,
          'No measurement types match the current search.',
        )}
      </article>
    </section>
  `

  document.getElementById('measurement-type-search').addEventListener('input', (event) => {
    state.measurementTypeSearch = event.target.value
    renderMeasurementTypesCatalog()
  })
  document.getElementById('measurement-type-form').addEventListener('submit', saveMeasurementType)
}

function renderMovementPatternsCatalog() {
  const filteredPatterns = state.movementPatterns.filter((id) =>
    matchesSearch([
      id,
      state.i18n.en?.exercises?.movementPatterns?.names?.[id] || '',
      state.i18n['zh-CN']?.exercises?.movementPatterns?.names?.[id] || '',
      state.i18n.en?.exercises?.movementPatterns?.aliases?.[id] || [],
      state.i18n['zh-CN']?.exercises?.movementPatterns?.aliases?.[id] || [],
    ], state.movementPatternSearch),
  )
  app.innerHTML = `
    <section>
      ${renderCatalogPageNav()}
      <article>
        <h2>${state.editingMovementPatternId ? 'Edit movement pattern' : 'New movement pattern'}</h2>
        <div class="toolbar">
          <label>
            Search movement patterns
            <input id="movement-pattern-search" value="${escapeHtml(state.movementPatternSearch)}" placeholder="id, name, alias" />
          </label>
          <div>
            <button type="button" onclick="startNewMovementPattern()">New movement pattern</button>
          </div>
        </div>
        ${renderIdForm('movement-pattern-form', 'movement-pattern-id', state.editingMovementPatternId, 'movement pattern')}
        <h3>Movement Patterns <span class="status-pill">${filteredPatterns.length} / ${state.movementPatterns.length}</span></h3>
        ${renderCompactTable(
          ['id', 'en name', 'zh-CN name', 'used by exercises', 'Actions'],
          filteredPatterns,
          renderMovementPatternRow,
          'No movement patterns match the current search.',
        )}
      </article>
    </section>
  `

  document.getElementById('movement-pattern-search').addEventListener('input', (event) => {
    state.movementPatternSearch = event.target.value
    renderMovementPatternsCatalog()
  })
  document.getElementById('movement-pattern-form').addEventListener('submit', saveMovementPatternCatalog)
}

function renderIdForm(formId, inputId, value, label) {
  return `
    <form id="${formId}">
      <div class="form-grid">
        <label>
          id
          <input id="${inputId}" required value="${escapeHtml(value || '')}" />
        </label>
      </div>
      <button type="submit">${value ? `Save ${label}` : `Add ${label}`}</button>
      <button type="button" class="secondary" onclick="${value && label === 'measurement type' ? 'startNewMeasurementType()' : value && label === 'movement pattern' ? 'startNewMovementPattern()' : label === 'measurement type' ? 'startNewMeasurementType()' : 'startNewMovementPattern()'}">Reset</button>
    </form>
  `
}

function renderMeasurementTypeRow(id) {
  const usedBy = state.catalog.exercises.filter((exercise) => exercise.measurementType === id).length
  return `
    <tr>
      <td>${escapeHtml(id)}</td>
      <td>${usedBy}</td>
      <td>
        <button type="button" class="secondary" onclick="editMeasurementType('${escapeHtml(id)}')">Edit</button>
        <button type="button" class="contrast" onclick="deleteMeasurementType('${escapeHtml(id)}')">Delete</button>
      </td>
    </tr>
  `
}

function renderMovementPatternRow(id) {
  const usedBy = state.catalog.exercises.filter((exercise) => exercise.movementPattern === id).length
  return `
    <tr>
      <td>${escapeHtml(id)}</td>
      <td>${escapeHtml(state.i18n.en?.exercises?.movementPatterns?.names?.[id] || '')}</td>
      <td>${escapeHtml(state.i18n['zh-CN']?.exercises?.movementPatterns?.names?.[id] || '')}</td>
      <td>${usedBy}</td>
      <td>
        <button type="button" class="secondary" onclick="editMovementPattern('${escapeHtml(id)}')">Edit</button>
        <button type="button" class="contrast" onclick="deleteMovementPattern('${escapeHtml(id)}')">Delete</button>
      </td>
    </tr>
  `
}

function renderMuscleGroupsSection() {
  const filteredGroups = state.muscleGroups.filter((id) =>
    matchesSearch([
      id,
      state.i18n.en?.muscles?.groups?.[id] || '',
      state.i18n['zh-CN']?.muscles?.groups?.[id] || '',
      state.i18n.en?.muscles?.groupAliases?.[id] || [],
      state.i18n['zh-CN']?.muscles?.groupAliases?.[id] || [],
    ], state.muscleGroupSearch),
  )
  const editing = state.editingMuscleGroupId

  return `
    <article>
      <h2>${editing ? 'Edit muscle group' : 'New muscle group'}</h2>
      <div class="toolbar">
        <label>
          Search muscle groups
          <input id="muscle-group-search" value="${escapeHtml(state.muscleGroupSearch)}" placeholder="id, name, alias" />
        </label>
        <div>
          <button type="button" onclick="startNewMuscleGroup()">New muscle group</button>
        </div>
      </div>
      ${renderMuscleGroupForm(editing)}
      <h3>Muscle Groups <span class="status-pill">${filteredGroups.length} / ${state.muscleGroups.length}</span></h3>
        ${renderCompactTable(
          ['id', 'en name', 'zh-CN name', 'used by exercises', 'Actions'],
          filteredGroups,
          renderMuscleGroupRow,
          'No muscle groups match the current search.',
        )}
    </article>
  `
}

function renderMuscleGroupForm(groupId) {
  const value = groupId || ''
  return `
    <form id="muscle-group-form">
      <div class="form-grid">
        <label>
          id
          <input id="muscle-group-id" required value="${escapeHtml(value)}" />
        </label>
        <label>
          en name
          <input id="muscle-group-en-name" value="${escapeHtml(state.i18n.en?.muscles?.groups?.[value] || '')}" />
        </label>
        <label>
          zh-CN name
          <input id="muscle-group-zh-name" value="${escapeHtml(state.i18n['zh-CN']?.muscles?.groups?.[value] || '')}" />
        </label>
      </div>
      <button type="submit">${groupId ? 'Save muscle group' : 'Add muscle group'}</button>
      <button type="button" class="secondary" onclick="startNewMuscleGroup()">Reset</button>
    </form>
  `
}

function renderMuscleGroupRow(groupId) {
  const usedBy = state.catalog.exercises.filter((exercise) =>
    [...(exercise.primaryMuscleGroupIds || []), ...(exercise.secondaryMuscleGroupIds || [])].includes(groupId),
  ).length
  return `
    <tr>
      <td>${escapeHtml(groupId)}</td>
      <td>${escapeHtml(state.i18n.en?.muscles?.groups?.[groupId] || '')}</td>
      <td>${escapeHtml(state.i18n['zh-CN']?.muscles?.groups?.[groupId] || '')}</td>
      <td>${usedBy}</td>
      <td>
        <button type="button" class="secondary" onclick="editMuscleGroupCatalog('${escapeHtml(groupId)}')">Edit</button>
        <button type="button" class="contrast" onclick="deleteMuscleGroupCatalog('${escapeHtml(groupId)}')">Delete</button>
      </td>
    </tr>
  `
}

function saveExercise(event) {
  event.preventDefault()
  const exercise = {
    id: document.getElementById('exercise-id').value.trim(),
    slug: document.getElementById('exercise-slug').value.trim(),
    primaryMuscleGroupIds: selectedValues('exercise-primary-muscle-group-ids'),
    secondaryMuscleGroupIds: selectedValues('exercise-secondary-muscle-group-ids'),
    movementPattern: document.getElementById('exercise-movement-pattern').value,
    measurementType: document.getElementById('exercise-measurement-type').value,
    sourceUrls: linesToArray(document.getElementById('exercise-source-urls').value),
  }

  if (!exercise.id || !exercise.slug) {
    window.alert('id and slug are required.')
    return
  }

  const duplicate = state.catalog.exercises.find(
    (item) => item.id === exercise.id && item.id !== state.editingExerciseId,
  )
  if (duplicate) {
    window.alert(`Exercise id already exists: ${exercise.id}`)
    return
  }

  if (state.editingExerciseId) {
    state.catalog.exercises = state.catalog.exercises.map((item) =>
      item.id === state.editingExerciseId ? exercise : item,
    )
  } else {
    state.catalog.exercises.push(exercise)
  }

  state.editingExerciseId = exercise.id
  renderCatalog()
}

function startNewExercise() {
  state.editingExerciseId = null
  renderCatalog()
}

function editExercise(id) {
  state.editingExerciseId = id
  renderCatalog()
}

function deleteExercise(id) {
  if (!window.confirm(`Delete exercise "${id}" from catalog? i18n entries will remain until edited separately.`)) return
  state.catalog.exercises = state.catalog.exercises.filter((exercise) => exercise.id !== id)
  if (state.editingExerciseId === id) state.editingExerciseId = null
  renderCatalog()
}

function setCatalogPage(page) {
  state.catalogPage = page
  renderCatalog()
}

function saveMeasurementType(event) {
  event.preventDefault()
  const nextId = document.getElementById('measurement-type-id').value.trim()
  const previousId = state.editingMeasurementTypeId

  if (!nextId) {
    window.alert('id is required.')
    return
  }

  const duplicate = state.measurementTypes.includes(nextId) && nextId !== previousId
  if (duplicate) {
    window.alert(`Measurement type id already exists: ${nextId}`)
    return
  }

  if (previousId) {
    state.measurementTypes = state.measurementTypes.map((id) => (id === previousId ? nextId : id))
    state.catalog.exercises = state.catalog.exercises.map((exercise) => ({
      ...exercise,
      measurementType: exercise.measurementType === previousId ? nextId : exercise.measurementType,
    }))
  } else {
    state.measurementTypes.push(nextId)
  }

  state.measurementTypes = Array.from(new Set(state.measurementTypes))
  state.editingMeasurementTypeId = nextId
  renderMeasurementTypesCatalog()
}

function startNewMeasurementType() {
  state.editingMeasurementTypeId = null
  renderMeasurementTypesCatalog()
}

function editMeasurementType(id) {
  state.editingMeasurementTypeId = id
  renderMeasurementTypesCatalog()
}

function deleteMeasurementType(id) {
  const usedBy = state.catalog.exercises.filter((exercise) => exercise.measurementType === id).length
  if (!window.confirm(`Delete measurement type "${id}"? ${usedBy} exercises currently use this type.`)) return
  state.measurementTypes = state.measurementTypes.filter((typeId) => typeId !== id)
  if (state.editingMeasurementTypeId === id) state.editingMeasurementTypeId = null
  renderMeasurementTypesCatalog()
}

function saveMovementPatternCatalog(event) {
  event.preventDefault()
  const nextId = document.getElementById('movement-pattern-id').value.trim()
  const previousId = state.editingMovementPatternId

  if (!nextId) {
    window.alert('id is required.')
    return
  }

  const duplicate = state.movementPatterns.includes(nextId) && nextId !== previousId
  if (duplicate) {
    window.alert(`Movement pattern id already exists: ${nextId}`)
    return
  }

  ensureNamespace('en', 'exercises')
  ensureNamespace('zh-CN', 'exercises')

  if (previousId) {
    state.movementPatterns = state.movementPatterns.map((id) => (id === previousId ? nextId : id))
    state.catalog.exercises = state.catalog.exercises.map((exercise) => ({
      ...exercise,
      movementPattern: exercise.movementPattern === previousId ? nextId : exercise.movementPattern,
    }))
    ;['en', 'zh-CN'].forEach((locale) => {
      const movementPatterns = state.i18n[locale].exercises.movementPatterns
      moveObjectKey(movementPatterns.names, previousId, nextId)
      moveObjectKey(movementPatterns.descriptions, previousId, nextId)
      moveObjectKey(movementPatterns.aliases, previousId, nextId)
    })
  } else {
    state.movementPatterns.push(nextId)
  }

  state.movementPatterns = Array.from(new Set(state.movementPatterns))
  state.editingMovementPatternId = nextId
  renderMovementPatternsCatalog()
}

function startNewMovementPattern() {
  state.editingMovementPatternId = null
  renderMovementPatternsCatalog()
}

function editMovementPattern(id) {
  state.editingMovementPatternId = id
  renderMovementPatternsCatalog()
}

function deleteMovementPattern(id) {
  const usedBy = state.catalog.exercises.filter((exercise) => exercise.movementPattern === id).length
  if (!window.confirm(`Delete movement pattern "${id}"? ${usedBy} exercises currently use this pattern.`)) return
  state.movementPatterns = state.movementPatterns.filter((patternId) => patternId !== id)
  ;['en', 'zh-CN'].forEach((locale) => {
    const movementPatterns = state.i18n[locale]?.exercises?.movementPatterns
    delete movementPatterns?.names?.[id]
    delete movementPatterns?.descriptions?.[id]
    delete movementPatterns?.aliases?.[id]
  })
  if (state.editingMovementPatternId === id) state.editingMovementPatternId = null
  renderMovementPatternsCatalog()
}

function saveMuscleGroupCatalog(event) {
  event.preventDefault()
  const nextId = document.getElementById('muscle-group-id').value.trim()
  const enName = document.getElementById('muscle-group-en-name').value.trim()
  const zhName = document.getElementById('muscle-group-zh-name').value.trim()
  const previousId = state.editingMuscleGroupId

  if (!nextId) {
    window.alert('id is required.')
    return
  }

  const duplicate = state.muscleGroups.includes(nextId) && nextId !== previousId
  if (duplicate) {
    window.alert(`Muscle group id already exists: ${nextId}`)
    return
  }

  ensureNamespace('en', 'muscles')
  ensureNamespace('zh-CN', 'muscles')

  if (previousId) {
    state.muscleGroups = state.muscleGroups.map((id) => (id === previousId ? nextId : id))
    state.catalog.exercises = state.catalog.exercises.map((exercise) => ({
      ...exercise,
      primaryMuscleGroupIds: (exercise.primaryMuscleGroupIds || []).map((id) => (id === previousId ? nextId : id)),
      secondaryMuscleGroupIds: (exercise.secondaryMuscleGroupIds || []).map((id) => (id === previousId ? nextId : id)),
    }))
    moveObjectKey(state.i18n.en.muscles.groups, previousId, nextId)
    moveObjectKey(state.i18n['zh-CN'].muscles.groups, previousId, nextId)
    moveObjectKey(state.i18n.en.muscles.groupAliases, previousId, nextId)
    moveObjectKey(state.i18n['zh-CN'].muscles.groupAliases, previousId, nextId)
  } else {
    state.muscleGroups.push(nextId)
  }

  state.i18n.en.muscles.groups[nextId] = enName
  state.i18n['zh-CN'].muscles.groups[nextId] = zhName
  state.muscleGroups = Array.from(new Set(state.muscleGroups))
  state.editingMuscleGroupId = nextId
  renderMuscleGroupsCatalog()
}

function startNewMuscleGroup() {
  state.editingMuscleGroupId = null
  renderMuscleGroupsCatalog()
}

function editMuscleGroupCatalog(id) {
  state.editingMuscleGroupId = id
  renderMuscleGroupsCatalog()
}

function deleteMuscleGroupCatalog(id) {
  const usedBy = state.catalog.exercises.filter((exercise) =>
    [...(exercise.primaryMuscleGroupIds || []), ...(exercise.secondaryMuscleGroupIds || [])].includes(id),
  ).length
  if (!window.confirm(`Delete muscle group "${id}"? ${usedBy} exercises currently use this group.`)) return
  state.muscleGroups = state.muscleGroups.filter((groupId) => groupId !== id)
  delete state.i18n.en?.muscles?.groups?.[id]
  delete state.i18n['zh-CN']?.muscles?.groups?.[id]
  delete state.i18n.en?.muscles?.groupAliases?.[id]
  delete state.i18n['zh-CN']?.muscles?.groupAliases?.[id]
  if (state.editingMuscleGroupId === id) state.editingMuscleGroupId = null
  renderMuscleGroupsCatalog()
}

function moveObjectKey(object, previousKey, nextKey) {
  if (!object || previousKey === nextKey || !(previousKey in object)) return
  object[nextKey] = object[previousKey]
  delete object[previousKey]
}

function renderI18n() {
  ensureLocale('en')
  ensureLocale('zh-CN')
  const ids = namespaceIds(state.i18nNamespace)
  const rows = ids.filter((id) => matchesI18nRow(id))
  const hasNamespace = Boolean(state.i18n.en[state.i18nNamespace] && state.i18n['zh-CN'][state.i18nNamespace])

  app.innerHTML = `
    <section>
      <div class="toolbar">
        <label>
          namespace
          <select id="i18n-namespace">
            ${['exercises', 'muscles']
              .map((namespace) => `<option value="${namespace}" ${namespace === state.i18nNamespace ? 'selected' : ''}>${namespace}</option>`)
              .join('')}
          </select>
        </label>
        <label>
          locale view
          <select id="i18n-locale-view">
            ${[
              ['both', 'en + zh-CN'],
              ['en', 'en'],
              ['zh-CN', 'zh-CN'],
            ]
              .map(([value, label]) => `<option value="${value}" ${value === state.i18nLocaleView ? 'selected' : ''}>${label}</option>`)
              .join('')}
          </select>
        </label>
        <label>
          search
          <input id="i18n-search" value="${escapeHtml(state.i18nSearch)}" placeholder="id, name, alias" />
        </label>
        <label>
          filter
          <select id="i18n-filter">
            ${[
              ['all', 'All'],
              ['missing-en', 'Missing English name'],
              ['missing-zh', 'Missing Chinese name'],
              ['empty-alias', 'Alias empty'],
            ]
              .map(([value, label]) => `<option value="${value}" ${value === state.i18nFilter ? 'selected' : ''}>${label}</option>`)
              .join('')}
          </select>
        </label>
        <div>
          <button type="button" onclick="generateI18nTemplate()">Generate missing keys</button>
        </div>
      </div>
      <p class="${hasNamespace ? 'muted' : 'warning'}">${hasNamespace ? 'Namespace loaded.' : '待创建：当前 namespace 缺少一个或多个 locale 对象。'}</p>
      ${state.i18nNamespace === 'exercises' ? renderMovementPatternsEditor() : ''}
      ${state.i18nNamespace === 'muscles' ? renderMuscleGroupsEditor() : ''}
      ${state.i18nNamespace !== 'muscles' ? `<article>
        <h2>${state.i18nNamespace} i18n <span class="status-pill">${rows.length} / ${ids.length}</span></h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>id</th>
                ${state.i18nLocaleView !== 'zh-CN' ? '<th>en name</th><th>en aliases</th>' : ''}
                ${state.i18nLocaleView !== 'en' ? '<th>zh-CN name</th><th>zh-CN aliases</th>' : ''}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(renderI18nRow).join('')}
            </tbody>
          </table>
        </div>
      </article>` : ''}
    </section>
  `

  document.getElementById('i18n-namespace').addEventListener('change', (event) => {
    state.i18nNamespace = event.target.value
    renderI18n()
  })
  document.getElementById('i18n-locale-view').addEventListener('change', (event) => {
    state.i18nLocaleView = event.target.value
    renderI18n()
  })
  document.getElementById('i18n-search').addEventListener('input', (event) => {
    state.i18nSearch = event.target.value
    renderI18n()
  })
  document.getElementById('i18n-filter').addEventListener('change', (event) => {
    state.i18nFilter = event.target.value
    renderI18n()
  })
}

function ensureLocale(locale) {
  if (!state.i18n[locale]) state.i18n[locale] = {}
}

function ensureNamespace(locale, namespace) {
  ensureLocale(locale)
  if (!state.i18n[locale][namespace]) {
    state.i18n[locale][namespace] = namespace === 'muscles'
      ? { groups: {}, groupAliases: {} }
      : { names: {}, aliases: {}, movementPatterns: { names: {}, descriptions: {}, aliases: {} } }
  }
  if (namespace !== 'muscles' && !state.i18n[locale][namespace].names) state.i18n[locale][namespace].names = {}
  if (namespace !== 'muscles' && !state.i18n[locale][namespace].aliases) state.i18n[locale][namespace].aliases = {}
  if (namespace === 'muscles' && !state.i18n[locale][namespace].groups) {
    state.i18n[locale][namespace].groups = {}
  }
  if (namespace === 'muscles' && !state.i18n[locale][namespace].groupAliases) {
    state.i18n[locale][namespace].groupAliases = {}
  }
  if (namespace === 'exercises' && !state.i18n[locale][namespace].movementPatterns) {
    state.i18n[locale][namespace].movementPatterns = { names: {}, descriptions: {}, aliases: {} }
  }
  if (namespace === 'exercises' && !state.i18n[locale][namespace].movementPatterns.names) {
    state.i18n[locale][namespace].movementPatterns.names = {}
  }
  if (namespace === 'exercises' && !state.i18n[locale][namespace].movementPatterns.descriptions) {
    state.i18n[locale][namespace].movementPatterns.descriptions = {}
  }
  if (namespace === 'exercises' && !state.i18n[locale][namespace].movementPatterns.aliases) {
    state.i18n[locale][namespace].movementPatterns.aliases = {}
  }
}

function namespaceIds(namespace) {
  if (namespace === 'exercises') return state.catalog.exercises.map((item) => item.id)
  return [...state.muscleGroups]
}

function groupIds() {
  const ids = [...state.muscleGroups]
  Object.values(state.i18n).forEach((locale) => {
    Object.keys(locale.muscles?.groups || {}).forEach((id) => ids.push(id))
  })
  return Array.from(new Set(ids)).sort()
}

function i18nEntry(locale, namespace, id) {
  const bundle = state.i18n[locale]?.[namespace]
  return {
    name: bundle?.names?.[id] || '',
    aliases: bundle?.aliases?.[id] || [],
  }
}

function matchesI18nRow(id) {
  const en = i18nEntry('en', state.i18nNamespace, id)
  const zh = i18nEntry('zh-CN', state.i18nNamespace, id)
  const aliasesEmpty = en.aliases.length === 0 && zh.aliases.length === 0

  if (state.i18nFilter === 'missing-en' && en.name) return false
  if (state.i18nFilter === 'missing-zh' && zh.name) return false
  if (state.i18nFilter === 'empty-alias' && !aliasesEmpty) return false

  return matchesSearch([id, en.name, zh.name, en.aliases, zh.aliases], state.i18nSearch)
}

function renderI18nRow(id) {
  const en = i18nEntry('en', state.i18nNamespace, id)
  const zh = i18nEntry('zh-CN', state.i18nNamespace, id)
  return `
    <tr>
      <td>${escapeHtml(id)}</td>
      ${state.i18nLocaleView !== 'zh-CN'
        ? `
          <td><input id="i18n-en-name-${id}" value="${escapeHtml(en.name)}" /></td>
          <td><textarea class="compact-textarea" id="i18n-en-aliases-${id}">${arrayTextarea(en.aliases)}</textarea></td>
        `
        : ''}
      ${state.i18nLocaleView !== 'en'
        ? `
          <td><input id="i18n-zh-CN-name-${id}" value="${escapeHtml(zh.name)}" /></td>
          <td><textarea class="compact-textarea" id="i18n-zh-CN-aliases-${id}">${arrayTextarea(zh.aliases)}</textarea></td>
        `
        : ''}
      <td><button type="button" onclick="saveI18nRow('${escapeHtml(id)}')">Save</button></td>
    </tr>
  `
}

function saveI18nRow(id) {
  ;['en', 'zh-CN'].forEach((locale) => {
    if (state.i18nLocaleView !== 'both' && state.i18nLocaleView !== locale) return
    ensureNamespace(locale, state.i18nNamespace)
    const nameInput = document.getElementById(`i18n-${locale}-name-${id}`)
    const aliasesInput = document.getElementById(`i18n-${locale}-aliases-${id}`)
    if (nameInput) state.i18n[locale][state.i18nNamespace].names[id] = nameInput.value.trim()
    if (aliasesInput) state.i18n[locale][state.i18nNamespace].aliases[id] = linesToArray(aliasesInput.value)
  })
  renderI18n()
}

function renderMovementPatternsEditor() {
  return `
    <article>
      <h2>Movement patterns</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>id</th><th>en name</th><th>en description</th><th>en aliases</th><th>zh-CN name</th><th>zh-CN description</th><th>zh-CN aliases</th><th>Actions</th></tr></thead>
          <tbody>
            ${state.movementPatterns
              .map(
                (id) => `
                  <tr>
                    <td>${escapeHtml(id)}</td>
                    <td><input id="movement-en-name-${id}" value="${escapeHtml(state.i18n.en.exercises?.movementPatterns?.names?.[id] || '')}" /></td>
                    <td><textarea class="compact-textarea" id="movement-en-description-${id}">${escapeHtml(state.i18n.en.exercises?.movementPatterns?.descriptions?.[id] || '')}</textarea></td>
                    <td><textarea class="compact-textarea" id="movement-en-aliases-${id}">${arrayTextarea(state.i18n.en.exercises?.movementPatterns?.aliases?.[id] || [])}</textarea></td>
                    <td><input id="movement-zh-CN-name-${id}" value="${escapeHtml(state.i18n['zh-CN'].exercises?.movementPatterns?.names?.[id] || '')}" /></td>
                    <td><textarea class="compact-textarea" id="movement-zh-CN-description-${id}">${escapeHtml(state.i18n['zh-CN'].exercises?.movementPatterns?.descriptions?.[id] || '')}</textarea></td>
                    <td><textarea class="compact-textarea" id="movement-zh-CN-aliases-${id}">${arrayTextarea(state.i18n['zh-CN'].exercises?.movementPatterns?.aliases?.[id] || [])}</textarea></td>
                    <td><button type="button" onclick="saveMovementPattern('${escapeHtml(id)}')">Save</button></td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </article>
  `
}

function saveMovementPattern(id) {
  ;['en', 'zh-CN'].forEach((locale) => {
    ensureNamespace(locale, 'exercises')
    state.i18n[locale].exercises.movementPatterns.names[id] = document.getElementById(`movement-${locale}-name-${id}`).value.trim()
    state.i18n[locale].exercises.movementPatterns.descriptions[id] = document.getElementById(`movement-${locale}-description-${id}`).value.trim()
    state.i18n[locale].exercises.movementPatterns.aliases[id] = linesToArray(document.getElementById(`movement-${locale}-aliases-${id}`).value)
  })
  renderI18n()
}

function renderMuscleGroupsEditor() {
  return `
    <article>
      <h2>Muscle groups</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>group id</th><th>en name</th><th>en aliases</th><th>zh-CN name</th><th>zh-CN aliases</th><th>Actions</th></tr></thead>
          <tbody>
            ${groupIds()
              .map(
                (id) => `
                  <tr>
                    <td>${escapeHtml(id)}</td>
                    <td><input id="group-en-${id}" value="${escapeHtml(state.i18n.en.muscles?.groups?.[id] || '')}" /></td>
                    <td><textarea class="compact-textarea" id="group-en-aliases-${id}">${arrayTextarea(state.i18n.en.muscles?.groupAliases?.[id] || [])}</textarea></td>
                    <td><input id="group-zh-CN-${id}" value="${escapeHtml(state.i18n['zh-CN'].muscles?.groups?.[id] || '')}" /></td>
                    <td><textarea class="compact-textarea" id="group-zh-CN-aliases-${id}">${arrayTextarea(state.i18n['zh-CN'].muscles?.groupAliases?.[id] || [])}</textarea></td>
                    <td><button type="button" onclick="saveMuscleGroup('${escapeHtml(id)}')">Save</button></td>
                  </tr>
                `,
              )
              .join('')}
          </tbody>
        </table>
      </div>
    </article>
  `
}

function saveMuscleGroup(id) {
  ;['en', 'zh-CN'].forEach((locale) => {
    ensureNamespace(locale, 'muscles')
    state.i18n[locale].muscles.groups[id] = document.getElementById(`group-${locale}-${id}`).value.trim()
    state.i18n[locale].muscles.groupAliases[id] = linesToArray(document.getElementById(`group-${locale}-aliases-${id}`).value)
  })
  renderI18n()
}

function generateI18nTemplate() {
  const namespace = state.i18nNamespace
  ;['en', 'zh-CN'].forEach((locale) => {
    ensureNamespace(locale, namespace)
    if (namespace !== 'muscles') {
      namespaceIds(namespace).forEach((id) => {
        if (!(id in state.i18n[locale][namespace].names)) state.i18n[locale][namespace].names[id] = ''
        if (!(id in state.i18n[locale][namespace].aliases)) state.i18n[locale][namespace].aliases[id] = []
      })
    }
    if (namespace === 'muscles') {
      groupIds().forEach((id) => {
        if (!(id in state.i18n[locale].muscles.groups)) state.i18n[locale].muscles.groups[id] = ''
        if (!(id in state.i18n[locale].muscles.groupAliases)) state.i18n[locale].muscles.groupAliases[id] = []
      })
    }
    if (namespace === 'exercises') {
      state.movementPatterns.forEach((id) => {
        if (!(id in state.i18n[locale].exercises.movementPatterns.names)) {
          state.i18n[locale].exercises.movementPatterns.names[id] = ''
        }
        if (!(id in state.i18n[locale].exercises.movementPatterns.descriptions)) {
          state.i18n[locale].exercises.movementPatterns.descriptions[id] = ''
        }
        if (!(id in state.i18n[locale].exercises.movementPatterns.aliases)) {
          state.i18n[locale].exercises.movementPatterns.aliases[id] = []
        }
      })
    }
  })
  renderI18n()
}

function renderValidate() {
  const results = validateAll()
  app.innerHTML = `
    <section>
      <h2>Validate</h2>
      <p>
        <span class="status-pill">${results.filter((item) => item.level === 'error').length} errors</span>
        <span class="status-pill">${results.filter((item) => item.level === 'warning').length} warnings</span>
      </p>
      <div class="table-wrap">
        <table>
          <thead><tr><th>level</th><th>scope</th><th>message</th></tr></thead>
          <tbody>
            ${results.length
              ? results.map((item) => `<tr><td class="${item.level === 'error' ? 'danger' : 'warning'}">${item.level}</td><td>${escapeHtml(item.scope)}</td><td>${escapeHtml(item.message)}</td></tr>`).join('')
              : '<tr><td colspan="3">No validation issues.</td></tr>'}
          </tbody>
        </table>
      </div>
    </section>
  `
}

function renderSync() {
  const supported = Boolean(window.showDirectoryPicker)
  app.innerHTML = `
    <section>
      <h2>Sync</h2>
      <p class="${supported ? 'muted' : 'warning'}">
        ${supported
          ? 'Select the TrainRe project root to read and write source files from this page.'
          : 'This browser does not support the File System Access API. Use a recent Chromium browser for direct file sync.'}
      </p>
      <div class="sync-actions">
        <button type="button" onclick="selectProjectDirectory()" ${supported ? '' : 'disabled'}>Select project root</button>
        <button type="button" onclick="loadFromProjectFiles()" ${state.projectDirectoryHandle ? '' : 'disabled'}>Load from source files</button>
        <button type="button" class="contrast" onclick="writeToProjectFiles()" ${state.projectDirectoryHandle ? '' : 'disabled'}>Write current state</button>
      </div>
      <article>
        <h3>Files</h3>
        <ul>
          ${exportPaths.map((path) => `<li><code>${path}</code></li>`).join('')}
        </ul>
      </article>
      <article>
        <h3>Status</h3>
        <pre class="sync-log">${escapeHtml(state.syncMessage)}</pre>
      </article>
    </section>
  `
}

async function selectProjectDirectory() {
  try {
    state.projectDirectoryHandle = await window.showDirectoryPicker({ mode: 'readwrite' })
    state.syncMessage = `Selected project folder: ${state.projectDirectoryHandle.name}`
  } catch (error) {
    state.syncMessage = `Folder selection cancelled or failed.\n${error.message || error}`
  }
  renderSync()
}

async function loadFromProjectFiles() {
  try {
    const files = await readProjectFiles(exportPaths)
    state.catalog = {
      exercises: parseCatalogSource(files['src/domain/exercise-catalog/exercises.ts'], 'exercises'),
    }
    state.measurementTypes = parseCatalogSource(files['src/domain/exercise-catalog/measurement-types.ts'], 'measurementTypes')
    state.movementPatterns = parseCatalogSource(files['src/domain/exercise-catalog/movement-patterns.ts'], 'movementPatterns')
    state.muscleGroups = parseCatalogSource(files['src/domain/exercise-catalog/muscles.ts'], 'muscleGroups')
    state.i18n = {
      en: {
        exercises: parseLocaleSource(files['src/locales/en/exercises.ts'], 'exercises'),
        muscles: parseLocaleSource(files['src/locales/en/muscles.ts'], 'muscles'),
      },
      'zh-CN': {
        exercises: parseLocaleSource(files['src/locales/zh-CN/exercises.ts'], 'exercises'),
        muscles: parseLocaleSource(files['src/locales/zh-CN/muscles.ts'], 'muscles'),
      },
    }
    state.editingExerciseId = null
    state.editingMeasurementTypeId = null
    state.editingMovementPatternId = null
    state.editingMuscleGroupId = null
    state.syncMessage = `Loaded ${exportPaths.length} source files from project folder.`
  } catch (error) {
    state.syncMessage = `Load failed.\n${error.message || error}`
  }
  renderSync()
}

async function writeToProjectFiles() {
  try {
    for (const path of exportPaths) {
      await writeProjectFile(path, generateExport(path))
    }
    state.syncMessage = `Wrote ${exportPaths.length} files:\n${exportPaths.join('\n')}`
  } catch (error) {
    state.syncMessage = `Write failed.\n${error.message || error}`
  }
  renderSync()
}

function validateAll() {
  const issues = []
  const add = (level, scope, message) => issues.push({ level, scope, message })

  findDuplicates(state.catalog.exercises.map((item) => item.id)).forEach((id) => add('error', 'catalog.exercises', `Duplicate exercise id: ${id}`))
  findDuplicates(state.catalog.exercises.map((item) => item.slug)).forEach((slug) => add('error', 'catalog.exercises', `Duplicate exercise slug: ${slug}`))
  findDuplicates(state.measurementTypes).forEach((id) => add('error', 'catalog.measurementTypes', `Duplicate measurement type id: ${id}`))
  findDuplicates(state.movementPatterns).forEach((id) => add('error', 'catalog.movementPatterns', `Duplicate movement pattern id: ${id}`))
  findDuplicates(state.muscleGroups).forEach((id) => add('error', 'catalog.muscleGroups', `Duplicate muscle group id: ${id}`))

  const measurementTypeIds = new Set(state.measurementTypes)
  const muscleGroupIds = new Set(state.muscleGroups)
  const movementPatternIds = new Set(state.movementPatterns)
  state.catalog.exercises.forEach((exercise) => {
    ;[...(exercise.primaryMuscleGroupIds || []), ...(exercise.secondaryMuscleGroupIds || [])].forEach((id) => {
      if (!muscleGroupIds.has(id)) add('error', exercise.id, `Unknown muscleGroupId: ${id}`)
    })
    if (!movementPatternIds.has(exercise.movementPattern)) add('error', exercise.id, `Invalid movementPattern: ${exercise.movementPattern}`)
    if (!measurementTypeIds.has(exercise.measurementType)) {
      add('error', exercise.id, `Invalid measurementType: ${exercise.measurementType}`)
    }
    if (!exercise.sourceUrls.length) {
      add('warning', exercise.id, 'sourceUrls is empty')
    }
    exercise.sourceUrls.forEach((url) => {
      if (!looksLikeUrl(url)) add('error', exercise.id, `sourceUrl does not look like a URL: ${url}`)
    })
  })

  ;['en', 'zh-CN'].forEach((locale) => {
    if (!state.i18n[locale]?.muscles) add('warning', `i18n.${locale}.muscles`, 'Muscle i18n file/object is missing')
    state.movementPatterns.forEach((id) => {
      if (!state.i18n[locale]?.exercises?.movementPatterns?.names?.[id]) {
        add('error', `i18n.${locale}.exercises`, `Movement pattern is missing a name: ${id}`)
      }
      if (!state.i18n[locale]?.exercises?.movementPatterns?.descriptions?.[id]) {
        add('error', `i18n.${locale}.exercises`, `Movement pattern is missing a description: ${id}`)
      }
    })
    state.muscleGroups.forEach((id) => {
      if (!state.i18n[locale]?.muscles?.groups?.[id]) {
        add('error', `i18n.${locale}.muscles`, `Muscle group is missing a name: ${id}`)
      }
    })
  })

  const catalogExerciseIds = new Set(state.catalog.exercises.map((item) => item.id))
  ;['en', 'zh-CN'].forEach((locale) => {
    const names = state.i18n[locale]?.exercises?.names || {}
    catalogExerciseIds.forEach((id) => {
      if (!names[id]) add('error', `i18n.${locale}.exercises`, `Catalog exercise id is missing a name: ${id}`)
    })
    Object.keys(names).forEach((id) => {
      if (!catalogExerciseIds.has(id)) add('error', `i18n.${locale}.exercises`, `Name exists without catalog exercise: ${id}`)
    })
  })

  const enNames = state.i18n.en?.exercises?.names || {}
  const zhNames = state.i18n['zh-CN']?.exercises?.names || {}
  Array.from(new Set([...Object.keys(enNames), ...Object.keys(zhNames)])).forEach((id) => {
    if (enNames[id] && !zhNames[id]) add('error', 'i18n.exercises', `English name exists but zh-CN name is missing: ${id}`)
    if (zhNames[id] && !enNames[id]) add('error', 'i18n.exercises', `zh-CN name exists but English name is missing: ${id}`)
  })

  return issues
}

function findDuplicates(values) {
  const seen = new Set()
  const duplicates = new Set()
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value)
    seen.add(value)
  })
  return Array.from(duplicates)
}

function looksLikeUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function renderExport() {
  const output = generateExport(state.exportPath)
  app.innerHTML = `
    <section>
      <div class="export-toolbar">
        <label>
          file
          <select id="export-path">
            ${exportPaths.map((path) => `<option value="${path}" ${path === state.exportPath ? 'selected' : ''}>${path}</option>`).join('')}
          </select>
        </label>
        <div>
          <button type="button" onclick="copyExport()">Copy</button>
          <span class="muted">${escapeHtml(state.copyMessage)}</span>
        </div>
      </div>
      <textarea class="code-output" id="export-output" spellcheck="false">${escapeHtml(output)}</textarea>
    </section>
  `
  document.getElementById('export-path').addEventListener('change', (event) => {
    state.exportPath = event.target.value
    state.copyMessage = ''
    renderExport()
  })
}

async function copyExport() {
  const output = document.getElementById('export-output').value
  try {
    await navigator.clipboard.writeText(output)
    state.copyMessage = 'Copied.'
  } catch {
    state.copyMessage = 'Copy failed. Please copy from the textarea manually.'
  }
  renderExport()
}

async function readProjectFiles(paths) {
  const files = {}
  for (const path of paths) {
    const handle = await getFileHandle(path)
    files[path] = await (await handle.getFile()).text()
  }
  return files
}

async function writeProjectFile(path, content) {
  const handle = await getFileHandle(path, { create: true })
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

async function getFileHandle(path, options = {}) {
  if (!state.projectDirectoryHandle) throw new Error('Project folder is not selected.')
  const parts = path.split('/')
  const fileName = parts.pop()
  let directory = state.projectDirectoryHandle
  for (const part of parts) {
    directory = await directory.getDirectoryHandle(part, options)
  }
  return directory.getFileHandle(fileName, options)
}

function parseCatalogSource(source, name) {
  const code = source
    .replace(/^\s*import\s+type[^\n]*\r?\n/gm, '')
    .replace(/\s+as\s+const\s*$/m, '')
    .replace(new RegExp(`export\\s+const\\s+${name}\\s*(?::\\s*[^=]+)?\\s*=`), 'return')
  return Function(code)()
}

function parseLocaleSource(source, name) {
  const code = source
    .replace(new RegExp(`const\\s+${name}\\s*=`), 'return')
    .replace(new RegExp(`export\\s+default\\s+${name}\\s*$`), '')
  return Function(code)()
}

function generateExport(path) {
  if (path.endsWith('domain/exercise-catalog/measurement-types.ts')) {
    return `export const measurementTypes = ${formatArray(state.measurementTypes, 0)} as const\n`
  }
  if (path.endsWith('domain/exercise-catalog/movement-patterns.ts')) {
    return `export const movementPatterns = ${formatArray(state.movementPatterns, 0)} as const\n`
  }
  if (path.endsWith('domain/exercise-catalog/types.ts')) {
    return generateTypesFile()
  }
  if (path.endsWith('domain/exercise-catalog/exercises.ts')) {
    return `import type { Exercise } from './types'\n\nexport const exercises: Exercise[] = ${formatArrayOfObjects(state.catalog.exercises)}\n`
  }
  if (path.endsWith('domain/exercise-catalog/muscles.ts')) {
    return `export const muscleGroups = ${formatArray(state.muscleGroups, 0)} as const\n`
  }

  const parts = path.split('/')
  const locale = parts[2]
  const namespace = parts[3].replace('.ts', '')
  return formatLocaleFile(namespace, state.i18n[locale]?.[namespace])
}

function formatLocaleFile(namespace, bundle) {
  const safeBundle = bundle || (namespace === 'muscles'
    ? { groups: {}, groupAliases: {} }
    : namespace === 'exercises'
      ? { names: {}, aliases: {}, movementPatterns: { names: {}, descriptions: {}, aliases: {} } }
      : { names: {}, aliases: {} })
  const blocks = []
  if (namespace === 'muscles') {
    blocks.push(`  groups: ${formatObject(safeBundle.groups || {}, 2)}`)
    blocks.push(`  groupAliases: ${formatObject(safeBundle.groupAliases || {}, 2)}`)
  } else {
    blocks.push(`  names: ${formatObject(safeBundle.names || {}, 2)}`)
    blocks.push(`  aliases: ${formatObject(safeBundle.aliases || {}, 2)}`)
  }
  if (namespace === 'exercises') {
    blocks.push(`  movementPatterns: ${formatObject(safeBundle.movementPatterns || { names: {}, descriptions: {}, aliases: {} }, 2)}`)
  }
  return `const ${namespace} = {\n${blocks.join(',\n')},\n}\n\nexport default ${namespace}\n`
}

function generateTypesFile() {
  return `import type { measurementTypes } from './measurement-types'
import type { movementPatterns } from './movement-patterns'
import type { muscleGroups } from './muscles'

export type MeasurementType = (typeof measurementTypes)[number]

export type MovementPattern = (typeof movementPatterns)[number]

export type MuscleGroup = (typeof muscleGroups)[number]

export type Exercise = {
  id: string
  slug: string
  primaryMuscleGroupIds: MuscleGroup[]
  secondaryMuscleGroupIds: MuscleGroup[]
  movementPattern: MovementPattern
  measurementType: MeasurementType
  sourceUrls: string[]
}

export type ExerciseCatalogReviewItem = {
  id: string
  reason: string
}
`
}

function formatArrayOfObjects(items) {
  if (!items.length) return '[]'
  return `[\n${items.map((item) => `  ${formatObject(item, 1)}`).join(',\n')},\n]`
}

function formatObject(value, level = 0) {
  const indent = '  '.repeat(level)
  const childIndent = '  '.repeat(level + 1)
  const entries = Object.entries(value || {})
  if (!entries.length) return '{}'
  return `{\n${entries
    .map(([key, item]) => `${childIndent}${key}: ${formatValue(item, level + 1)}`)
    .join(',\n')},\n${indent}}`
}

function formatValue(value, level) {
  if (Array.isArray(value)) return formatArray(value, level)
  if (value && typeof value === 'object') return formatObject(value, level)
  if (typeof value === 'string') return formatString(value)
  return String(value)
}

function formatArray(value, level) {
  if (!value.length) return '[]'
  return `[${value.map((item) => formatValue(item, level)).join(', ')}]`
}

function formatString(value) {
  return `'${String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

window.startNewExercise = startNewExercise
window.editExercise = editExercise
window.deleteExercise = deleteExercise
window.setCatalogPage = setCatalogPage
window.startNewMeasurementType = startNewMeasurementType
window.editMeasurementType = editMeasurementType
window.deleteMeasurementType = deleteMeasurementType
window.startNewMovementPattern = startNewMovementPattern
window.editMovementPattern = editMovementPattern
window.deleteMovementPattern = deleteMovementPattern
window.startNewMuscleGroup = startNewMuscleGroup
window.editMuscleGroupCatalog = editMuscleGroupCatalog
window.deleteMuscleGroupCatalog = deleteMuscleGroupCatalog
window.saveI18nRow = saveI18nRow
window.saveMovementPattern = saveMovementPattern
window.saveMuscleGroup = saveMuscleGroup
window.generateI18nTemplate = generateI18nTemplate
window.selectProjectDirectory = selectProjectDirectory
window.loadFromProjectFiles = loadFromProjectFiles
window.writeToProjectFiles = writeToProjectFiles
window.copyExport = copyExport

render()
