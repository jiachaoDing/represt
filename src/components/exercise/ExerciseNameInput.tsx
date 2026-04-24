import { useMemo, useState } from 'react'

import { findExerciseNameSuggestions } from '../../lib/exercise-dictionary'

type ExerciseNameInputProps = {
  className: string
  disabled: boolean
  onChange: (value: string) => void
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
  const [isFocused, setIsFocused] = useState(false)
  const suggestions = useMemo(() => findExerciseNameSuggestions(value), [value])
  const shouldShowSuggestions = isFocused && suggestions.length > 0

  return (
    <div className="relative">
      <input
        value={value}
        disabled={disabled}
        onBlur={() => setIsFocused(false)}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setIsFocused(true)}
        className={className}
        placeholder={placeholder}
      />

      {shouldShowSuggestions ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-72 overflow-y-auto rounded-xl border border-[var(--outline-variant)]/40 bg-[var(--surface-container)] shadow-lg">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.name}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(suggestion.name)
                setIsFocused(false)
              }}
              className="block w-full px-4 py-3 text-left text-sm font-medium text-[var(--on-surface)] transition-colors hover:bg-[var(--on-surface)]/5"
            >
              {suggestion.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
