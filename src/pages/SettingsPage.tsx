import { LocalReminderSettings } from '../components/settings/LocalReminderSettings'
import { PageHeader } from '../components/ui/PageHeader'
import { useHapticsPreference } from '../hooks/useHapticsPreference'
import { triggerHaptic } from '../lib/haptics'

function HapticsSettingsCard() {
  const { isEnabled, setIsEnabled } = useHapticsPreference()

  return (
    <section className="rounded-[1.25rem] border border-[var(--outline-variant)]/20 bg-[var(--surface)] px-5 py-4 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[var(--on-surface)]">触感反馈</p>
          <p className="mt-1 text-[13px] leading-5 text-[var(--on-surface-variant)]">
            完成、保存、撤销和危险操作时短促反馈
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={isEnabled}
          aria-label="触感反馈"
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
        测试触感反馈
      </button>
    </section>
  )
}

export function SettingsPage() {
  return (
    <div className="pb-4">
      <PageHeader title="设置" subtitle="提醒与交互" backFallbackTo="/" />

      <div className="mx-4 mt-4 space-y-3">
        <HapticsSettingsCard />
        <LocalReminderSettings open />
      </div>
    </div>
  )
}
