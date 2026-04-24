import type { ReactNode } from 'react'

type FloatingActionButtonProps = {
  icon?: ReactNode
  label?: string
  onClick: () => void
}

export function FloatingActionButton({ icon, label = '添加动作', onClick }: FloatingActionButtonProps) {
  return (
    <div className="fixed inset-x-0 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-30 flex justify-center pointer-events-none">
      <button
        type="button"
        onClick={onClick}
        className="pointer-events-auto flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-[var(--on-primary)] shadow-[0_4px_12px_rgba(22,78,48,0.2)] transition-transform hover:scale-[1.02] active:scale-95 tap-highlight-transparent"
        aria-label={label}
      >
        {icon || (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        )}
        <span className="font-medium text-[15px]">{label}</span>
      </button>
    </div>
  )
}
