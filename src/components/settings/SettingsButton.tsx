import { useState } from 'react'

import { useHapticsPreference } from '../../hooks/useHapticsPreference'
import { BottomSheet } from '../ui/BottomSheet'

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false)
  const { isEnabled, setIsEnabled } = useHapticsPreference()

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--outline-variant)] text-[var(--on-surface-variant)] transition-colors hover:bg-[var(--on-surface-variant)]/5"
        aria-label="设置"
      >
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        >
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.04.04a2 2 0 1 1-2.83 2.83l-.04-.04a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.07a1.7 1.7 0 0 0-1.02-1.56 1.7 1.7 0 0 0-1.89.34l-.04.04a2 2 0 1 1-2.83-2.83l.04-.04A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.07A1.7 1.7 0 0 0 4.6 8a1.7 1.7 0 0 0-.34-1.88l-.04-.04a2 2 0 1 1 2.83-2.83l.04.04A1.7 1.7 0 0 0 9 3.6 1.7 1.7 0 0 0 10 2.07V2a2 2 0 1 1 4 0v.07A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.04-.04a2 2 0 1 1 2.83 2.83l-.04.04A1.7 1.7 0 0 0 19.4 8a1.7 1.7 0 0 0 1.56 1.03H21a2 2 0 1 1 0 4h-.07A1.7 1.7 0 0 0 19.4 15Z" />
        </svg>
      </button>

      <BottomSheet open={isOpen} title="设置" onClose={() => setIsOpen(false)}>
        <div className="rounded-2xl bg-[var(--surface)] px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[var(--on-surface)]">触感反馈</p>
              <p className="mt-1 text-xs leading-5 text-[var(--on-surface-variant)]">
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
                'relative h-8 w-14 shrink-0 rounded-full transition-colors',
                isEnabled ? 'bg-[var(--primary)]' : 'bg-[var(--outline)]',
              ].join(' ')}
            >
              <span
                className={[
                  'absolute top-1 h-6 w-6 rounded-full bg-white transition-transform',
                  isEnabled ? 'translate-x-7' : 'translate-x-1',
                ].join(' ')}
              />
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  )
}
