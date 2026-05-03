import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  Check,
  ChevronRight,
  Info,
  Languages,
  Mail,
  Palette,
  ShieldCheck,
  Vibrate,
} from 'lucide-react'

import { LocalReminderSettings } from '../components/settings/LocalReminderSettings'
import { AnimatedSheet } from '../components/motion/AnimatedSheet'
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

const APP_VERSION = '1.0.0'
const PRIVACY_POLICY_URL = 'https://trainre.app/privacy'
const FEEDBACK_EMAIL = 'mailto:support@trainre.app?subject=TrainRe%20feedback'

type SettingsSectionProps = {
  children: ReactNode
  title: string
}

type SettingsRowProps = {
  icon: LucideIcon
  label: string
  onClick?: () => void
  right?: ReactNode
  supporting?: string
}

function SettingsSection({ children, title }: SettingsSectionProps) {
  return (
    <section>
      <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-normal text-[var(--on-surface-variant)]">
        {title}
      </h2>
      <div className="overflow-hidden rounded-2xl border border-[var(--outline-variant)]/35 bg-[var(--surface)]">
        {children}
      </div>
    </section>
  )
}

function SettingsRow({ icon: Icon, label, onClick, right, supporting }: SettingsRowProps) {
  const content = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-container)] text-[var(--primary)]">
        <Icon size={19} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-[var(--on-surface)]">{label}</span>
        {supporting ? (
          <span className="mt-0.5 block truncate text-xs text-[var(--on-surface-variant)]">{supporting}</span>
        ) : null}
      </span>
      {right ? <span className="shrink-0">{right}</span> : null}
    </>
  )

  if (!onClick) {
    return <div className="flex min-h-14 items-center gap-3 px-4 py-2.5">{content}</div>
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--surface-container)]"
    >
      {content}
    </button>
  )
}

function RowDivider() {
  return <div className="ml-16 h-px bg-[var(--outline-variant)]/35" />
}

function SwitchControl({ checked, label }: { checked: boolean; label: string }) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={[
        'inline-flex h-7 w-12 items-center rounded-full p-1 transition-colors',
        checked ? 'bg-[var(--primary)]' : 'bg-[var(--outline)]/60',
      ].join(' ')}
    >
      <span
        className={[
          'h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </span>
  )
}

function HapticsSettingsRow() {
  const { t } = useTranslation()
  const { isEnabled, setIsEnabled } = useHapticsPreference()

  return (
    <SettingsRow
      icon={Vibrate}
      label={t('settings.haptics.title')}
      supporting={t('settings.haptics.description')}
      onClick={() => {
        const nextEnabled = !isEnabled
        setIsEnabled(nextEnabled)
        if (nextEnabled) {
          void triggerHaptic('success')
        }
      }}
      right={<SwitchControl checked={isEnabled} label={t('settings.haptics.title')} />}
    />
  )
}

type PreferenceOption<T extends string> = {
  label: string
  value: T
}

function PreferenceSheet<T extends string>({
  onChange,
  onClose,
  open,
  options,
  title,
  value,
}: {
  onChange: (value: T) => void
  onClose: () => void
  open: boolean
  options: Array<PreferenceOption<T>>
  title: string
  value: T
}) {
  return (
    <AnimatedSheet open={open} onClose={onClose} title={title}>
      <div className="space-y-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => {
              onChange(option.value)
              onClose()
            }}
            className={[
              'flex min-h-12 w-full items-center justify-between rounded-xl px-4 text-left text-sm font-medium transition-colors',
              value === option.value
                ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                : 'bg-[var(--surface)] text-[var(--on-surface)] hover:bg-[var(--surface-container)]',
            ].join(' ')}
          >
            {option.label}
            {value === option.value ? (
              <Check size={18} strokeWidth={2.4} className="text-[var(--primary)]" aria-hidden="true" />
            ) : null}
          </button>
        ))}
      </div>
    </AnimatedSheet>
  )
}

function LanguageSettingsRow() {
  const { t } = useTranslation()
  const { preference, setPreference } = useLanguagePreference()
  const [isOpen, setIsOpen] = useState(false)
  const options: Array<{ value: LanguagePreference; label: string }> = [
    { value: 'system', label: t('settings.language.system') },
    { value: 'zh-CN', label: t('settings.language.zhCN') },
    { value: 'en', label: t('settings.language.en') },
  ]
  const currentLabel = options.find((option) => option.value === preference)?.label ?? options[0].label

  return (
    <>
      <SettingsRow
        icon={Languages}
        label={t('settings.language.title')}
        supporting={t('settings.language.subtitle')}
        onClick={() => setIsOpen(true)}
        right={<RowValue value={currentLabel} />}
      />
      <PreferenceSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('settings.language.title')}
        value={preference}
        options={options}
        onChange={setPreference}
      />
    </>
  )
}

function RowValue({ value }: { value: string }) {
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-[var(--on-surface-variant)]">
      <span className="max-w-24 truncate">{value}</span>
      <ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />
    </span>
  )
}

function ThemeSettingsRow() {
  const { t } = useTranslation()
  const { preference, setPreference } = useThemePreference()
  const [isOpen, setIsOpen] = useState(false)
  const options: Array<{ value: ThemePreference; label: string }> = [
    { value: 'system', label: t('settings.theme.system') },
    { value: 'light', label: t('settings.theme.light') },
    { value: 'dark', label: t('settings.theme.dark') },
  ]
  const currentLabel = options.find((option) => option.value === preference)?.label ?? options[0].label

  return (
    <>
      <SettingsRow
        icon={Palette}
        label={t('settings.theme.title')}
        supporting={t('settings.theme.subtitle')}
        onClick={() => setIsOpen(true)}
        right={<RowValue value={currentLabel} />}
      />
      <PreferenceSheet
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={t('settings.theme.title')}
        value={preference}
        options={options}
        onChange={setPreference}
      />
    </>
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
  const showDebugSettings = import.meta.env.DEV

  return (
    <div className="pb-4">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} backFallbackTo="/" />

      <div className="mx-4 mt-4 space-y-5">
        <SettingsSection title={t('settings.sections.general')}>
          <LanguageSettingsRow />
          <RowDivider />
          <ThemeSettingsRow />
          <RowDivider />
          <HapticsSettingsRow />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.reminders')}>
          <LocalReminderSettings />
        </SettingsSection>

        <SettingsSection title={t('settings.sections.support')}>
          <a href={PRIVACY_POLICY_URL} target="_blank" rel="noreferrer">
            <SettingsRow
              icon={ShieldCheck}
              label={t('settings.support.privacy')}
              right={<ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />}
            />
          </a>
          <RowDivider />
          <a href={FEEDBACK_EMAIL}>
            <SettingsRow
              icon={Mail}
              label={t('settings.support.feedback')}
              right={<ChevronRight size={16} strokeWidth={2.2} aria-hidden="true" />}
            />
          </a>
          <RowDivider />
          <SettingsRow
            icon={Info}
            label={t('settings.support.about')}
            supporting={t('common.appName')}
            right={<span className="text-xs font-medium text-[var(--on-surface-variant)]">{APP_VERSION}</span>}
          />
        </SettingsSection>

        {showDebugSettings ? (
          <SettingsSection title={t('settings.sections.developer')}>
            <DebugDateSettingsCard />
          </SettingsSection>
        ) : null}
      </div>
    </div>
  )
}
