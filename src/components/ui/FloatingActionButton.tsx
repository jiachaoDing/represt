type FloatingActionButtonProps = {
  label: string
  onClick: () => void
}

export function FloatingActionButton({ label, onClick }: FloatingActionButtonProps) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-[30rem] justify-end px-5">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex h-14 min-w-14 items-center justify-center rounded-[1.15rem] bg-[var(--brand)] px-5 text-sm font-semibold text-white shadow-[var(--shadow-soft)]"
      >
        + {label}
      </button>
    </div>
  )
}
