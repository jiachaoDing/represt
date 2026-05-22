import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'

type SummaryExportButtonProps = {
  ariaLabel: string
  text: string | null
}

export function SummaryExportButton({ ariaLabel, text }: SummaryExportButtonProps) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<'idle' | 'copied' | 'error'>('idle')
  const title = status === 'error'
    ? t('summary.export.copyFailed')
    : status === 'copied'
      ? t('summary.export.copied')
      : ariaLabel

  async function copySummary() {
    if (!text) {
      setStatus('error')
      window.setTimeout(() => setStatus('idle'), 1600)
      return
    }

    try {
      await navigator.clipboard.writeText(text)
      setStatus('copied')
      window.setTimeout(() => setStatus('idle'), 1400)
    } catch (error) {
      console.error(error)
      setStatus('error')
      window.setTimeout(() => setStatus('idle'), 1800)
    }
  }

  return (
    <button
      type="button"
      className={[
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors tap-highlight-transparent active:scale-[0.96]',
        status === 'copied'
          ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]'
          : 'bg-[var(--surface-container)] text-[var(--on-surface)]',
        status === 'error' ? 'text-[var(--error)]' : '',
        !text ? 'opacity-50' : '',
      ].join(' ')}
      disabled={!text}
      aria-label={ariaLabel}
      title={title}
      onClick={() => void copySummary()}
    >
      {status === 'copied' ? (
        <Check size={17} strokeWidth={2.4} aria-hidden="true" />
      ) : (
        <Copy size={17} strokeWidth={2.2} aria-hidden="true" />
      )}
    </button>
  )
}
