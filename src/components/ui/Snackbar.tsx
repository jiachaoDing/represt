type SnackbarProps = {
  message: string | null
  placement?: 'default' | 'aboveFab' | 'top'
}

const placementClassMap = {
  default: 'bottom-[calc(6.75rem+env(safe-area-inset-bottom))]',
  aboveFab: 'bottom-[calc(10.25rem+env(safe-area-inset-bottom))]',
  top: 'top-[calc(4.5rem+env(safe-area-inset-top))]',
}

export function Snackbar({ message, placement = 'default' }: SnackbarProps) {
  if (!message) {
    return null
  }

  return (
    <div className={`pointer-events-none fixed inset-x-0 z-50 mx-auto max-w-[30rem] px-4 ${placementClassMap[placement]}`}>
      <div
        className="mx-auto flex w-fit max-w-full items-center gap-2 rounded-2xl border border-[var(--primary)]/15 bg-[var(--primary-container)]/95 px-3.5 py-2.5 text-[13px] font-semibold text-[var(--on-primary-container)] shadow-[var(--shadow-soft)] backdrop-blur"
        role="status"
        aria-live="polite"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--on-primary)]">
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" />
          </svg>
        </span>
        {message}
      </div>
    </div>
  )
}
