const initialData = {
  catalog: { exercises: [], equipment: [], muscles: [] },
  i18n: {
    en: {
      exercises: { names: {}, aliases: {} },
      equipment: { names: {}, aliases: {} },
      muscles: { groups: {}, names: {}, aliases: {} },
    },
    'zh-CN': {
      exercises: { names: {}, aliases: {} },
      equipment: { names: {}, aliases: {} },
      muscles: { groups: {}, names: {}, aliases: {} },
    },
  },
}

const measurementTypes = ['weightReps', 'reps', 'duration', 'distance', 'weightDistance']
const defaultMuscleGroups = ['chest', 'back', 'shoulders', 'arms', 'core', 'hips', 'quadriceps', 'hamstrings', 'calves', 'fullBody']
const exportPaths = [
  'src/domain/exercise-catalog/types.ts',
  'src/domain/exercise-catalog/exercises.ts',
  'src/domain/exercise-catalog/equipment.ts',
  'src/domain/exercise-catalog/muscles.ts',
  'src/locales/en/exercises.ts',
  'src/locales/zh-CN/exercises.ts',
  'src/locales/en/equipment.ts',
  'src/locales/zh-CN/equipment.ts',
  'src/locales/en/muscles.ts',
  'src/locales/zh-CN/muscles.ts',
]

const state = {
  activeTab: 'catalog',
  catalogPage: 'exercises',
  catalog: structuredClone(initialData.catalog),
  i18n: structuredClone(initialData.i18n),
  catalogSearch: '',
  equipmentSearch: '',
  muscleSearch: '',
  muscleGroupSearch: '',
  muscleGroups: [...defaultMuscleGroups],
  editingExerciseId: null,
  editingEquipmentId: null,
  editingMuscleId: null,
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
  if (state.catalogPage === 'equipment') {
    renderEquipmentCatalog()
    return
  }
  if (state.catalogPage === 'muscles') {
    renderMusclesCatalog()
    return
  }
  renderExercisesCatalog()
}

function renderCatalogPageNav() {
  const pages = [
    ['exercises', 'Exercises'],
    ['equipment', 'Equipment'],
    ['muscles', 'Muscles'],
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
          <input id="catalog-search" value="${escapeHtml(state.catalogSearch)}" placeholder="id, slug, i18n alias, equipment, muscle" />
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
    equipmentIds: [],
    primaryMuscleIds: [],
    secondaryMuscleIds: [],
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
          measurementType
          <select id="exercise-measurement-type">
            ${measurementTypes
              .map((type) => `<option value="${type}" ${type === value.measurementType ? 'selected' : ''}>${type}</option>`)
              .join('')}
          </select>
        </label>
      </div>
      <div class="form-grid">
        ${renderCheckboxMultiSelect('exercise-equipment-ids', 'equipmentIds', state.catalog.equipment, value.equipmentIds)}
        ${renderCheckboxMultiSelect('exercise-primary-muscle-ids', 'primaryMuscleIds', state.catalog.muscles, value.primaryMuscleIds)}
        ${renderCheckboxMultiSelect('exercise-secondary-muscle-ids', 'secondaryMuscleIds', state.catalog.muscles, value.secondaryMuscleIds)}
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
          (item) => `
            <label>
              <input type="checkbox" value="${escapeHtml(item.id)}" ${selectedSet.has(item.id) ? 'checked' : ''} />
              <span>${escapeHtml(item.id)}</span>
            </label>
          `,
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
        ${renderCardField('measurementType', [exercise.measurementType])}
        ${renderCardField('equipmentIds', exercise.equipmentIds)}
        ${renderCardField('primaryMuscleIds', exercise.primaryMuscleIds)}
        ${renderCardField('secondaryMuscleIds', exercise.secondaryMuscleIds)}
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
  return [
    exercise.id,
    exercise.slug,
    exercise.equipmentIds,
    exercise.primaryMuscleIds,
    exercise.secondaryMuscleIds,
    state.i18n.en?.exercises?.aliases?.[exercise.id] || [],
    state.i18n['zh-CN']?.exercises?.aliases?.[exercise.id] || [],
  ]
}

function renderEquipmentCatalog() {
  const filteredEquipment = state.catalog.equipment.filter((equipment) =>
    matchesSearch([equipment.id], state.equipmentSearch),
  )
  const editing = state.catalog.equipment.find((equipment) => equipment.id === state.editingEquipmentId)

  app.innerHTML = `
    <section>
      ${renderCatalogPageNav()}
      <div class="toolbar">
        <label>
          Search equipment
          <input id="equipment-search" value="${escapeHtml(state.equipmentSearch)}" placeholder="id" />
        </label>
        <div>
          <button type="button" onclick="startNewEquipment()">New equipment</button>
        </div>
      </div>
      <article>
        <h2>${editing ? 'Edit equipment' : 'New equipment'}</h2>
        ${renderEquipmentForm(editing)}
      </article>
      <article>
        <h2>Equipment <span class="status-pill">${filteredEquipment.length} / ${state.catalog.equipment.length}</span></h2>
        ${renderCompactTable(
          ['id', 'Actions'],
          filteredEquipment,
          renderEquipmentRow,
          'No equipment matches the current search.',
        )}
      </article>
    </section>
  `

  document.getElementById('equipment-search').addEventListener('input', (event) => {
    state.equipmentSearch = event.target.value
    renderEquipmentCatalog()
  })
  document.getElementById('equipment-form').addEventListener('submit', saveEquipment)
}

function renderEquipmentForm(equipment) {
  const value = equipment || { id: '' }
  return `
    <form id="equipment-form">
      <div class="form-grid">
        <label>
          id
          <input id="equipment-id" required value="${escapeHtml(value.id)}" />
        </label>
      </div>
      <button type="submit">${equipment ? 'Save equipment' : 'Add equipment'}</button>
      <button type="button" class="secondary" onclick="startNewEquipment()">Reset</button>
    </form>
  `
}

function renderEquipmentRow(equipment) {
  return `
    <tr>
      <td>${escapeHtml(equipment.id)}</td>
      <td>
          <button type="button" class="secondary" onclick="editEquipment('${escapeHtml(equipment.id)}')">Edit</button>
          <button type="button" class="contrast" onclick="deleteEquipment('${escapeHtml(equipment.id)}')">Delete</button>
      </td>
    </tr>
  `
}

function renderMusclesCatalog() {
  const filteredMuscles = state.catalog.muscles.filter((muscle) =>
    matchesSearch([muscle.id, muscle.groupId], state.muscleSearch),
  )
  const editing = state.catalog.muscles.find((muscle) => muscle.id === state.editingMuscleId)

  app.innerHTML = `
    <section>
      ${renderCatalogPageNav()}
      <div class="toolbar">
        <label>
          Search muscles
          <input id="muscle-search" value="${escapeHtml(state.muscleSearch)}" placeholder="id, group" />
        </label>
        <div>
          <button type="button" onclick="startNewMuscle()">New muscle</button>
        </div>
      </div>
      <article>
        <h2>${editing ? 'Edit muscle' : 'New muscle'}</h2>
        ${renderMuscleForm(editing)}
      </article>
      <article>
        <h2>Muscles <span class="status-pill">${filteredMuscles.length} / ${state.catalog.muscles.length}</span></h2>
        ${renderCompactTable(
          ['id', 'groupId', 'Actions'],
          filteredMuscles,
          renderMuscleRow,
          'No muscles match the current search.',
        )}
      </article>
      ${renderMuscleGroupsSection()}
    </section>
  `

  document.getElementById('muscle-search').addEventListener('input', (event) => {
    state.muscleSearch = event.target.value
    renderMusclesCatalog()
  })
  document.getElementById('muscle-form').addEventListener('submit', saveMuscle)
  document.getElementById('muscle-group-search').addEventListener('input', (event) => {
    state.muscleGroupSearch = event.target.value
    renderMusclesCatalog()
  })
  document.getElementById('muscle-group-form').addEventListener('submit', saveMuscleGroupCatalog)
}

function renderMuscleForm(muscle) {
  const value = muscle || { id: '', groupId: state.muscleGroups[0] || '' }
  return `
    <form id="muscle-form">
      <div class="form-grid">
        <label>
          id
          <input id="muscle-id" required value="${escapeHtml(value.id)}" />
        </label>
        <label>
          groupId
          <select id="muscle-group-id">
            ${state.muscleGroups
              .map((group) => `<option value="${group}" ${group === value.groupId ? 'selected' : ''}>${group}</option>`)
              .join('')}
          </select>
        </label>
      </div>
      <button type="submit">${muscle ? 'Save muscle' : 'Add muscle'}</button>
      <button type="button" class="secondary" onclick="startNewMuscle()">Reset</button>
    </form>
  `
}

function renderMuscleRow(muscle) {
  return `
    <tr>
      <td>${escapeHtml(muscle.id)}</td>
      <td>${escapeHtml(muscle.groupId)}</td>
      <td>
          <button type="button" class="secondary" onclick="editMuscle('${escapeHtml(muscle.id)}')">Edit</button>
          <button type="button" class="contrast" onclick="deleteMuscle('${escapeHtml(muscle.id)}')">Delete</button>
      </td>
    </tr>
  `
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

function renderMuscleGroupsSection() {
  const filteredGroups = state.muscleGroups.filter((id) =>
    matchesSearch([id, state.i18n.en?.muscles?.groups?.[id] || '', state.i18n['zh-CN']?.muscles?.groups?.[id] || ''], state.muscleGroupSearch),
  )
  const editing = state.editingMuscleGroupId

  return `
    <article>
      <h2>${editing ? 'Edit muscle group' : 'New muscle group'}</h2>
      <div class="toolbar">
        <label>
          Search muscle groups
          <input id="muscle-group-search" value="${escapeHtml(state.muscleGroupSearch)}" placeholder="id, en name, zh-CN name" />
        </label>
        <div>
          <button type="button" onclick="startNewMuscleGroup()">New muscle group</button>
        </div>
      </div>
      ${renderMuscleGroupForm(editing)}
      <h3>Muscle Groups <span class="status-pill">${filteredGroups.length} / ${state.muscleGroups.length}</span></h3>
        ${renderCompactTable(
          ['id', 'en name', 'zh-CN name', 'used by', 'Actions'],
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
  const usedBy = state.catalog.muscles.filter((muscle) => muscle.groupId === groupId).length
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
    equipmentIds: selectedValues('exercise-equipment-ids'),
    primaryMuscleIds: selectedValues('exercise-primary-muscle-ids'),
    secondaryMuscleIds: selectedValues('exercise-secondary-muscle-ids'),
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

function saveEquipment(event) {
  event.preventDefault()
  const equipment = {
    id: document.getElementById('equipment-id').value.trim(),
  }

  if (!equipment.id) {
    window.alert('id is required.')
    return
  }

  const duplicate = state.catalog.equipment.find(
    (item) => item.id === equipment.id && item.id !== state.editingEquipmentId,
  )
  if (duplicate) {
    window.alert(`Equipment id already exists: ${equipment.id}`)
    return
  }

  if (state.editingEquipmentId) {
    state.catalog.equipment = state.catalog.equipment.map((item) =>
      item.id === state.editingEquipmentId ? equipment : item,
    )
  } else {
    state.catalog.equipment.push(equipment)
  }

  state.editingEquipmentId = equipment.id
  renderEquipmentCatalog()
}

function startNewEquipment() {
  state.editingEquipmentId = null
  renderEquipmentCatalog()
}

function editEquipment(id) {
  state.editingEquipmentId = id
  renderEquipmentCatalog()
}

function deleteEquipment(id) {
  if (!window.confirm(`Delete equipment "${id}" from catalog? Exercise references will be checked on the Validate page.`)) return
  state.catalog.equipment = state.catalog.equipment.filter((equipment) => equipment.id !== id)
  if (state.editingEquipmentId === id) state.editingEquipmentId = null
  renderEquipmentCatalog()
}

function saveMuscle(event) {
  event.preventDefault()
  const muscle = {
    id: document.getElementById('muscle-id').value.trim(),
    groupId: document.getElementById('muscle-group-id').value,
  }

  if (!muscle.id) {
    window.alert('id is required.')
    return
  }

  const duplicate = state.catalog.muscles.find(
    (item) => item.id === muscle.id && item.id !== state.editingMuscleId,
  )
  if (duplicate) {
    window.alert(`Muscle id already exists: ${muscle.id}`)
    return
  }

  if (state.editingMuscleId) {
    state.catalog.muscles = state.catalog.muscles.map((item) => (item.id === state.editingMuscleId ? muscle : item))
  } else {
    state.catalog.muscles.push(muscle)
  }

  state.editingMuscleId = muscle.id
  renderMusclesCatalog()
}

function startNewMuscle() {
  state.editingMuscleId = null
  renderMusclesCatalog()
}

function editMuscle(id) {
  state.editingMuscleId = id
  renderMusclesCatalog()
}

function deleteMuscle(id) {
  if (!window.confirm(`Delete muscle "${id}" from catalog? Exercise references will be checked on the Validate page.`)) return
  state.catalog.muscles = state.catalog.muscles.filter((muscle) => muscle.id !== id)
  if (state.editingMuscleId === id) state.editingMuscleId = null
  renderMusclesCatalog()
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
    state.catalog.muscles = state.catalog.muscles.map((muscle) =>
      muscle.groupId === previousId ? { ...muscle, groupId: nextId } : muscle,
    )
    moveObjectKey(state.i18n.en.muscles.groups, previousId, nextId)
    moveObjectKey(state.i18n['zh-CN'].muscles.groups, previousId, nextId)
  } else {
    state.muscleGroups.push(nextId)
  }

  state.i18n.en.muscles.groups[nextId] = enName
  state.i18n['zh-CN'].muscles.groups[nextId] = zhName
  state.muscleGroups = Array.from(new Set(state.muscleGroups))
  state.editingMuscleGroupId = nextId
  renderMusclesCatalog()
}

function startNewMuscleGroup() {
  state.editingMuscleGroupId = null
  renderMusclesCatalog()
}

function editMuscleGroupCatalog(id) {
  state.editingMuscleGroupId = id
  renderMusclesCatalog()
}

function deleteMuscleGroupCatalog(id) {
  const usedBy = state.catalog.muscles.filter((muscle) => muscle.groupId === id).length
  if (!window.confirm(`Delete muscle group "${id}"? ${usedBy} muscles currently use this group.`)) return
  state.muscleGroups = state.muscleGroups.filter((groupId) => groupId !== id)
  delete state.i18n.en?.muscles?.groups?.[id]
  delete state.i18n['zh-CN']?.muscles?.groups?.[id]
  if (state.editingMuscleGroupId === id) state.editingMuscleGroupId = null
  renderMusclesCatalog()
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
            ${['exercises', 'equipment', 'muscles']
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
      ${state.i18nNamespace === 'muscles' ? renderMuscleGroupsEditor() : ''}
      <article>
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
      </article>
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
      ? { groups: {}, names: {}, aliases: {} }
      : { names: {}, aliases: {} }
  }
  if (!state.i18n[locale][namespace].names) state.i18n[locale][namespace].names = {}
  if (!state.i18n[locale][namespace].aliases) state.i18n[locale][namespace].aliases = {}
  if (namespace === 'muscles' && !state.i18n[locale][namespace].groups) {
    state.i18n[locale][namespace].groups = {}
  }
}

function namespaceIds(namespace) {
  if (namespace === 'exercises') return state.catalog.exercises.map((item) => item.id)
  if (namespace === 'equipment') return state.catalog.equipment.map((item) => item.id)
  return state.catalog.muscles.map((item) => item.id)
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

function renderMuscleGroupsEditor() {
  return `
    <article>
      <h2>Muscle group names</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>group id</th><th>en name</th><th>zh-CN name</th><th>Actions</th></tr></thead>
          <tbody>
            ${groupIds()
              .map(
                (id) => `
                  <tr>
                    <td>${escapeHtml(id)}</td>
                    <td><input id="group-en-${id}" value="${escapeHtml(state.i18n.en.muscles?.groups?.[id] || '')}" /></td>
                    <td><input id="group-zh-CN-${id}" value="${escapeHtml(state.i18n['zh-CN'].muscles?.groups?.[id] || '')}" /></td>
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
  })
  renderI18n()
}

function generateI18nTemplate() {
  const namespace = state.i18nNamespace
  ;['en', 'zh-CN'].forEach((locale) => {
    ensureNamespace(locale, namespace)
    namespaceIds(namespace).forEach((id) => {
      if (!(id in state.i18n[locale][namespace].names)) state.i18n[locale][namespace].names[id] = ''
      if (!(id in state.i18n[locale][namespace].aliases)) state.i18n[locale][namespace].aliases[id] = []
    })
    if (namespace === 'muscles') {
      groupIds().forEach((id) => {
        if (!(id in state.i18n[locale].muscles.groups)) state.i18n[locale].muscles.groups[id] = ''
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
      equipment: parseCatalogSource(files['src/domain/exercise-catalog/equipment.ts'], 'equipment'),
      muscles: parseCatalogSource(files['src/domain/exercise-catalog/muscles.ts'], 'muscles'),
    }
    state.muscleGroups = parseMuscleGroupsSource(files['src/domain/exercise-catalog/types.ts'])
    state.i18n = {
      en: {
        exercises: parseLocaleSource(files['src/locales/en/exercises.ts'], 'exercises'),
        equipment: parseLocaleSource(files['src/locales/en/equipment.ts'], 'equipment'),
        muscles: parseLocaleSource(files['src/locales/en/muscles.ts'], 'muscles'),
      },
      'zh-CN': {
        exercises: parseLocaleSource(files['src/locales/zh-CN/exercises.ts'], 'exercises'),
        equipment: parseLocaleSource(files['src/locales/zh-CN/equipment.ts'], 'equipment'),
        muscles: parseLocaleSource(files['src/locales/zh-CN/muscles.ts'], 'muscles'),
      },
    }
    state.editingExerciseId = null
    state.editingEquipmentId = null
    state.editingMuscleId = null
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
  findDuplicates(state.catalog.equipment.map((item) => item.id)).forEach((id) => add('error', 'catalog.equipment', `Duplicate equipment id: ${id}`))
  findDuplicates(state.catalog.muscles.map((item) => item.id)).forEach((id) => add('error', 'catalog.muscles', `Duplicate muscle id: ${id}`))
  findDuplicates(state.muscleGroups).forEach((id) => add('error', 'catalog.muscleGroups', `Duplicate muscle group id: ${id}`))

  const equipmentIds = new Set(state.catalog.equipment.map((item) => item.id))
  const muscleIds = new Set(state.catalog.muscles.map((item) => item.id))
  const muscleGroupIds = new Set(state.muscleGroups)
  state.catalog.muscles.forEach((muscle) => {
    if (!muscleGroupIds.has(muscle.groupId)) add('error', muscle.id, `Unknown muscle groupId: ${muscle.groupId}`)
  })
  state.catalog.exercises.forEach((exercise) => {
    exercise.equipmentIds.forEach((id) => {
      if (!equipmentIds.has(id)) add('error', exercise.id, `Unknown equipmentId: ${id}`)
    })
    ;[...exercise.primaryMuscleIds, ...exercise.secondaryMuscleIds].forEach((id) => {
      if (!muscleIds.has(id)) add('error', exercise.id, `Unknown muscleId: ${id}`)
    })
    if (!measurementTypes.includes(exercise.measurementType)) {
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
    if (!state.i18n[locale]?.equipment) add('warning', `i18n.${locale}.equipment`, 'Equipment i18n file/object is missing')
    if (!state.i18n[locale]?.muscles) add('warning', `i18n.${locale}.muscles`, 'Muscle i18n file/object is missing')
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
    .replace(new RegExp(`export\\s+const\\s+${name}\\s*:\\s*\\w+\\[\\]\\s*=`), 'return')
  return Function(code)()
}

function parseLocaleSource(source, name) {
  const code = source
    .replace(new RegExp(`const\\s+${name}\\s*=`), 'return')
    .replace(new RegExp(`export\\s+default\\s+${name}\\s*$`), '')
  return Function(code)()
}

function parseMuscleGroupsSource(source) {
  const match = source.match(/export\s+type\s+MuscleGroup\s*=([\s\S]*?)\n\nexport\s+type\s+Equipment/)
  if (!match) return [...defaultMuscleGroups]
  return Array.from(match[1].matchAll(/'([^']+)'/g), (item) => item[1])
}

function generateExport(path) {
  if (path.endsWith('domain/exercise-catalog/types.ts')) {
    return generateTypesFile()
  }
  if (path.endsWith('domain/exercise-catalog/exercises.ts')) {
    return `import type { Exercise } from './types'\n\nexport const exercises: Exercise[] = ${formatArrayOfObjects(state.catalog.exercises)}\n`
  }
  if (path.endsWith('domain/exercise-catalog/equipment.ts')) {
    return `import type { Equipment } from './types'\n\nexport const equipment: Equipment[] = ${formatArrayOfObjects(state.catalog.equipment)}\n`
  }
  if (path.endsWith('domain/exercise-catalog/muscles.ts')) {
    return `import type { Muscle } from './types'\n\nexport const muscles: Muscle[] = ${formatArrayOfObjects(state.catalog.muscles)}\n`
  }

  const parts = path.split('/')
  const locale = parts[2]
  const namespace = parts[3].replace('.ts', '')
  return formatLocaleFile(namespace, state.i18n[locale]?.[namespace])
}

function formatLocaleFile(namespace, bundle) {
  const safeBundle = bundle || (namespace === 'muscles' ? { groups: {}, names: {}, aliases: {} } : { names: {}, aliases: {} })
  const blocks = []
  if (namespace === 'muscles') blocks.push(`  groups: ${formatObject(safeBundle.groups || {}, 2)}`)
  blocks.push(`  names: ${formatObject(safeBundle.names || {}, 2)}`)
  blocks.push(`  aliases: ${formatObject(safeBundle.aliases || {}, 2)}`)
  return `const ${namespace} = {\n${blocks.join(',\n')},\n}\n\nexport default ${namespace}\n`
}

function generateTypesFile() {
  return `export type MeasurementType = ${measurementTypes.map(formatString).join(' | ')}

export type MuscleGroup =
${state.muscleGroups.map((group) => `  | ${formatString(group)}`).join('\n')}

export type Equipment = {
  id: string
}

export type Muscle = {
  id: string
  groupId: MuscleGroup
}

export type Exercise = {
  id: string
  slug: string
  equipmentIds: string[]
  primaryMuscleIds: string[]
  secondaryMuscleIds: string[]
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
window.startNewEquipment = startNewEquipment
window.editEquipment = editEquipment
window.deleteEquipment = deleteEquipment
window.startNewMuscle = startNewMuscle
window.editMuscle = editMuscle
window.deleteMuscle = deleteMuscle
window.startNewMuscleGroup = startNewMuscleGroup
window.editMuscleGroupCatalog = editMuscleGroupCatalog
window.deleteMuscleGroupCatalog = deleteMuscleGroupCatalog
window.saveI18nRow = saveI18nRow
window.saveMuscleGroup = saveMuscleGroup
window.generateI18nTemplate = generateI18nTemplate
window.selectProjectDirectory = selectProjectDirectory
window.loadFromProjectFiles = loadFromProjectFiles
window.writeToProjectFiles = writeToProjectFiles
window.copyExport = copyExport

render()
