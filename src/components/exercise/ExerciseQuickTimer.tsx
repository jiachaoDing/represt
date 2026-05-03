import { useEffect, useMemo, useState } from 'react'
import { Pause, Pencil, Play, RotateCcw } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useQuickTimer } from '../../hooks/useQuickTimer'
import { useNow } from '../../hooks/useNow'

function formatRemainingTime(remainingMs: number) {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function ExerciseQuickTimer() {
  const { t } = useTranslation()
  const { finish, pause, reset, selectSeconds, start, state: timerState, updateOptionSeconds } = useQuickTimer()
  const now = useNow(timerState.status === 'running' ? 16 : 1000)
  const [isEditingOptions, setIsEditingOptions] = useState(false)
  const [draftOptionSeconds, setDraftOptionSeconds] = useState(() =>
    timerState.optionSeconds.map((seconds) => String(seconds)),
  )

  const selectedMs = timerState.selectedSeconds * 1000
  const remainingMs =
    timerState.status === 'running' && timerState.endsAt
      ? Math.max(0, timerState.endsAt - now)
      : timerState.remainingMs
  const progress = selectedMs > 0 ? Math.min(1, Math.max(0, (selectedMs - remainingMs) / selectedMs)) : 0
  const circumference = 2 * Math.PI * 45
  const strokeOffset = circumference * (1 - progress)
  const isRunning = timerState.status === 'running'

  const controlItems = useMemo(
    () => [
      {
        key: 'edit',
        icon: Pencil,
        label: t('exercise.quickTimerEdit'),
        onClick: () => {
          setDraftOptionSeconds(timerState.optionSeconds.map((seconds) => String(seconds)))
          setIsEditingOptions((current) => !current)
        },
        primary: true,
      },
      {
        key: 'startPause',
        icon: isRunning ? Pause : Play,
        label: isRunning ? t('exercise.quickTimerPause') : t('exercise.quickTimerStart'),
        onClick: isRunning ? pause : start,
        primary: false,
      },
      {
        key: 'reset',
        icon: RotateCcw,
        label: t('exercise.quickTimerReset'),
        onClick: reset,
        primary: false,
      },
    ],
    [isRunning, pause, reset, start, t, timerState.optionSeconds],
  )

  useEffect(() => {
    if (timerState.status !== 'running' || !timerState.endsAt) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      finish()
    }, Math.max(0, timerState.endsAt - Date.now()))

    return () => window.clearTimeout(timeoutId)
  }, [finish, timerState.endsAt, timerState.status])

  function commitOptionSeconds(index: number) {
    const currentValue = draftOptionSeconds[index]
    if (!currentValue) {
      setDraftOptionSeconds((current) =>
        current.map((value, valueIndex) =>
          valueIndex === index ? String(timerState.optionSeconds[index]) : value,
        ),
      )
      return
    }

    updateOptionSeconds(index, Number(currentValue))
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col items-center justify-between py-4 text-center">
      <div className="shrink-0">
        <h2 className="text-[18px] font-bold text-[var(--primary)]">{t('exercise.quickTimerTitle')}</h2>
        <p className="mt-2 text-[15px] text-[var(--on-surface-variant)]">{t('exercise.quickTimerSubtitle')}</p>
      </div>

      <div
        className="relative my-3 flex size-[min(38dvh,17rem)] min-h-44 min-w-44 max-h-72 max-w-72 shrink items-center justify-center"
        aria-label={t('exercise.quickTimerProgressLabel')}
      >
        <svg className="absolute inset-0 size-full -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--primary-container)"
            strokeWidth="1.6"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="var(--primary)"
            strokeDasharray={circumference}
            strokeLinecap="round"
            strokeWidth="2.4"
            style={{ strokeDashoffset: strokeOffset }}
          />
        </svg>
        <p
          className="text-[3.75rem] font-semibold leading-none text-[var(--primary)]"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatRemainingTime(remainingMs)}
        </p>
      </div>

      <div className="grid w-full grid-cols-4 gap-2">
        {timerState.optionSeconds.map((seconds, index) => {
          const isSelected = timerState.selectedSeconds === seconds

          return isEditingOptions ? (
            <label
              key={index}
              className="flex h-11 items-center justify-center border-b border-[var(--outline)] px-1 text-[15px] font-medium text-[var(--on-surface)]"
            >
              <input
                type="text"
                inputMode="numeric"
                aria-label={t('exercise.quickTimerEditSeconds', { index: index + 1 })}
                value={draftOptionSeconds[index] ?? ''}
                onBlur={() => commitOptionSeconds(index)}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(/\D/g, '').slice(0, 4)
                  setDraftOptionSeconds((current) =>
                    current.map((value, valueIndex) => (valueIndex === index ? nextValue : value)),
                  )
                  if (nextValue) {
                    updateOptionSeconds(index, Number(nextValue))
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.currentTarget.blur()
                  }
                }}
                className="min-w-0 flex-1 bg-transparent text-center outline-none"
              />
              <span className="shrink-0 text-[var(--on-surface-variant)]">{t('exercise.quickTimerSecondsUnit')}</span>
            </label>
          ) : (
            <button
              key={index}
              type="button"
              aria-pressed={isSelected}
              onClick={() => selectSeconds(seconds)}
              className={[
                'h-11 rounded-full border text-[15px] font-medium transition-colors tap-highlight-transparent',
                isSelected
                  ? 'border-[var(--primary)] bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                  : 'border-[var(--outline-variant)] text-[var(--on-surface)] hover:bg-[var(--surface-container)]',
              ].join(' ')}
            >
              {t('exercise.quickTimerSeconds', { seconds })}
            </button>
          )
        })}
      </div>

      <div className="mt-4 grid w-full grid-cols-3 border-y border-[var(--outline-variant)]/55 py-4">
        {controlItems.map((item) => {
          const Icon = item.icon

          return (
            <button
              key={item.key}
              type="button"
              onClick={item.onClick}
              className="flex flex-col items-center gap-2 text-[15px] font-medium text-[var(--on-surface)] tap-highlight-transparent"
            >
              <span
                className={[
                  'flex size-14 items-center justify-center rounded-full border transition-colors',
                  item.primary
                    ? 'border-[var(--primary)] text-[var(--primary)]'
                    : 'border-[var(--outline)] text-[var(--on-surface-variant)]',
                ].join(' ')}
              >
                <Icon size={25} fill={item.key === 'startPause' && !isRunning ? 'currentColor' : 'none'} strokeWidth={2.4} aria-hidden="true" />
              </span>
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
