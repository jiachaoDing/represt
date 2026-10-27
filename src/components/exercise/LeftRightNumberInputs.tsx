import { useTranslation } from 'react-i18next'

type LeftRightNumberInputsProps = {
  label: string
  left: string
  right: string
  onLeftChange: (value: string) => void
  onRightChange: (value: string) => void
  disabled: boolean
  inputMode: 'decimal' | 'numeric'
  step: string
  variant: 'plan' | 'record'
}

export function LeftRightNumberInputs({ label, left, right, onLeftChange, onRightChange, disabled, inputMode, step, variant }: LeftRightNumberInputsProps) {
  const { t } = useTranslation()
  return (
    <div>
      <span className="mb-1 ml-1 block text-xs font-medium text-[var(--on-surface-variant)]">{label}</span>
      <div className="grid grid-cols-2 gap-2">
        {(['left', 'right'] as const).map((side) => (
          <label key={side} className={`flex min-w-0 items-center gap-1 ${variant === 'plan'
            ? 'rounded-xl bg-[var(--surface-container)] px-2 ring-1 ring-transparent focus-within:ring-[var(--primary)]'
            : 'border-b border-[var(--on-surface)] px-1 focus-within:border-b-2 focus-within:border-[var(--primary)]'}`}>
            <span className="shrink-0 text-[10px] text-[var(--on-surface-variant)]">{t(`exercise.${side}Short`)}</span>
            <input
              aria-label={t('exercise.sideField', { side: t(`exercise.${side}Side`), field: label })}
              type="number"
              min={0}
              step={step}
              inputMode={inputMode}
              disabled={disabled}
              value={side === 'left' ? left : right}
              onChange={(event) => (side === 'left' ? onLeftChange : onRightChange)(event.target.value)}
              className="min-w-0 w-full bg-transparent py-3 text-base text-[var(--on-surface)] outline-none disabled:opacity-50"
            />
          </label>
        ))}
      </div>
    </div>
  )
}
