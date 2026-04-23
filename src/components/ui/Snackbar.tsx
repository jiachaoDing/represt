type SnackbarProps = {
  message: string | null
}

export function Snackbar({ message }: SnackbarProps) {
  if (!message) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(6.75rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-[30rem] px-4">
      <div className="rounded-full bg-[var(--surface-strong)] px-4 py-3 text-sm text-white shadow-[var(--shadow-soft)]">
        {message}
      </div>
    </div>
  )
}
