import type { ReactNode } from 'react'

type FloatingActionButtonProps = {
  icon?: ReactNode
  onClick: () => void
}

export function FloatingActionButton({ icon, onClick }: FloatingActionButtonProps) {
  return (
    <div className="fixed right-4 bottom-[calc(6.5rem+env(safe-area-inset-bottom))] z-30">
      <button
        type="button"
        onClick={onClick}
        className="flex h-14 w-14 items-center justify-center rounded-[1rem] bg-[var(--primary)] text-[var(--on-primary)] shadow-[var(--shadow-soft)] transition-transform hover:scale-[1.02] active:scale-95 tap-highlight-transparent"
        aria-label="新增动作"
      >
        {icon || (
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        )}
      </button>
    </div>
  )
}
