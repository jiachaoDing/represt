import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { listExerciseDefinitions, type ExerciseDefinition } from '../../db/exercise-models'
import { searchExerciseDefinitions, getDefinitionName } from '../../lib/exercise-search'
import type { ExerciseNameValue } from '../../lib/exercise-name'

type ExerciseNameInputProps = {
  className: string
  disabled: boolean
  onChange: (value: ExerciseNameValue) => void
  placeholder?: string
  value: string
}

export function ExerciseNameInput({
  className,
  disabled,
  onChange,
  placeholder,
  value,
}: ExerciseNameInputProps) {
  const { t } = useTranslation()
  const [isFocused, setIsFocused] = useState(false)
  const [definitions, setDefinitions] = useState<ExerciseDefinition[]>([])
  useEffect(() => {
    let cancelled = false
    void listExerciseDefinitions().then((items) => { if (!cancelled) setDefinitions(items) }).catch(console.error)
    return () => { cancelled = true }
  }, [isFocused])
  const suggestions = useMemo(
    () => searchExerciseDefinitions(definitions, value, t).slice(0, 8),
    [definitions, t, value],
  )
  const shouldShowSuggestions = isFocused && suggestions.length > 0

  return (
    <div className="relative">
      <input
        value={value}
        disabled={disabled}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onChange({ name: event.target.value, catalogExerciseId: null, exerciseProfileId: null, measurementType: null, loadMode: null })}
        onFocus={() => setIsFocused(true)}
        className={className}
        placeholder={placeholder}
      />

      {shouldShowSuggestions ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[var(--outline-variant)]/40 bg-[var(--surface-container)] shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.profileId}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange({ name: getDefinitionName(t, suggestion), catalogExerciseId: suggestion.catalogExerciseId, exerciseProfileId: suggestion.profileId, measurementType: suggestion.measurementType, loadMode: suggestion.loadMode })
                setIsFocused(false)
              }}
              className="block w-full px-4 py-3 text-left text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--on-surface)]/5"
            >
              {getDefinitionName(t, suggestion)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
