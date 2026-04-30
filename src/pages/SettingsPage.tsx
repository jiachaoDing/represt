import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { LocalReminderSettings } from '../components/settings/LocalReminderSettings'
import { PageHeader } from '../components/ui/PageHeader'
import { clearStoredCurrentSessionId } from '../db/sessions'
import { useHapticsPreference } from '../hooks/useHapticsPreference'
import { useLanguagePreference } from '../i18n/useLanguagePreference'
import type { LanguagePreference } from '../i18n/languages'
import { triggerHaptic } from '../lib/haptics'
import {
  getDebugDateOffsetDays,
  getTodaySessionDateKey,
  resetDebugDateOffset,
  setDebugTodaySessionDateKey,
} from '../lib/session-date-key'
import { useThemePreference, type ThemePreference } from '../lib/theme'

function HapticsSettingsCard() {
  const { t } = useTranslation()
  const { isEnabled, setIsEnabled } = useHapticsPreference()

  return (
    <section className="rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-5 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[var(--on-surface)]">{t('settings.haptics.title')}</p>
          <p className="mt-1 text-[13px] leading-5 text-[var(--on-surface-variant)]">
            {t('settings.haptics.description')}
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          aria-label={t('settings.haptics.title')}
          onClick={() => setIsEnabled(!isEnabled)}
          className={[
            'inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors',
            isEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--outline)]',
          ].join(' ')}
        >
          <span
            className={[
              'h-6 w-6 rounded-full bg-white shadow-sm transition-transform',
              isEnabled ? 'translate-x-6' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>
      <button
        type="button"
        disabled={!isEnabled}
        onClick={() => void triggerHaptic('success')}
        className="mt-4 rounded-full px-4 py-2 text-sm font-semibold text-[var(--primary)] transition-colors hover:bg-[var(--primary)]/10 disabled:opacity-40"
      >
        {t('settings.haptics.test')}
      </button>
    </section>
  )
}

function LanguageSettingsCard() {
  const { t } = useTranslation()
  const { preference, setPreference } = useLanguagePreference()
  const options: Array<{ value: LanguagePreference; label: string }> = [
    { value: 'system', label: t('settings.language.system') },
    { value: 'zh-CN', label: t('settings.language.zhCN') },
    { value: 'en', label: t('settings.language.en') },
  ]

  return (
    <section className="rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-5 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div>
        <p className="text-[15px] font-semibold text-[var(--on-surface)]">{t('settings.language.title')}</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--on-surface-variant)]">
          {t('settings.language.subtitle')}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={preference === option.value}
            onClick={() => setPreference(option.value)}
            className={[
              'min-h-10 rounded-full px-3 py-2 text-xs font-semibold transition-colors',
              preference === option.value
                ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                : 'border border-[var(--outline-variant)] text-[var(--on-surface)]',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function ThemeSettingsCard() {
  const { t } = useTranslation()
  const { preference, setPreference } = useThemePreference()
  const options: Array<{ value: ThemePreference; label: string }> = [
    { value: 'system', label: t('settings.theme.system') },
    { value: 'light', label: t('settings.theme.light') },
    { value: 'dark', label: t('settings.theme.dark') },
  ]

  return (
    <section className="rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-5 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div>
        <p className="text-[15px] font-semibold text-[var(--on-surface)]">{t('settings.theme.title')}</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--on-surface-variant)]">
          {t('settings.theme.subtitle')}
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={preference === option.value}
            onClick={() => setPreference(option.value)}
            className={[
              'min-h-10 rounded-full px-3 py-2 text-xs font-semibold transition-colors',
              preference === option.value
                ? 'bg-[var(--primary)] text-[var(--on-primary)]'
                : 'border border-[var(--outline-variant)] text-[var(--on-surface)]',
            ].join(' ')}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  )
}

function DebugDateSettingsCard() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedDateKey, setSelectedDateKey] = useState(getTodaySessionDateKey)
  const [offsetDays, setOffsetDays] = useState(getDebugDateOffsetDays)

  function handleApplyDate() {
    const nextOffsetDays = setDebugTodaySessionDateKey(selectedDateKey)
    setOffsetDays(nextOffsetDays)
    clearStoredCurrentSessionId()
    navigate('/')
  }

  function handleResetDate() {
    resetDebugDateOffset()
    const todayDateKey = getTodaySessionDateKey()
    setSelectedDateKey(todayDateKey)
    setOffsetDays(0)
    clearStoredCurrentSessionId()
    navigate('/')
  }

  return (
    <section className="rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-5 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div>
        <p className="text-[15px] font-semibold text-[var(--on-surface)]">{t('settings.debugDate.title')}</p>
        <p className="mt-1 text-[13px] leading-5 text-[var(--on-surface-variant)]">
          {t('settings.debugDate.description')}
        </p>
      </div>
      <p className="mt-3 text-[13px] font-medium text-[var(--on-surface-variant)]">
        {t('settings.debugDate.offset', { count: offsetDays })}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        <input
          type="date"
          value={selectedDateKey}
          onChange={(event) => setSelectedDateKey(event.target.value)}
          aria-label={t('settings.debugDate.dateLabel')}
          className="h-11 rounded-xl border border-[var(--outline-variant)] bg-[var(--surface-container)] px-3 text-sm font-medium text-[var(--on-surface)]"
        />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleApplyDate}
            disabled={!selectedDateKey}
            className="min-h-10 rounded-full bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-[var(--on-primary)] transition-colors disabled:opacity-40"
          >
            {t('settings.debugDate.apply')}
          </button>
          <button
            type="button"
            onClick={handleResetDate}
            className="min-h-10 rounded-full border border-[var(--outline-variant)] px-3 py-2 text-xs font-semibold text-[var(--on-surface)] transition-colors"
          >
            {t('settings.debugDate.reset')}
          </button>
        </div>
      </div>
    </section>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()

  return (
    <div className="pb-4">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} backFallbackTo="/" />

      <div className="mx-4 mt-4 space-y-3">
        <LanguageSettingsCard />
        <ThemeSettingsCard />
        <HapticsSettingsCard />
        <DebugDateSettingsCard />
        <LocalReminderSettings open />
      </div>
    </div>
  )
}
