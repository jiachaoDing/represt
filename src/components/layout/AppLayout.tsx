import type { MouseEvent } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'

import { PageTransition } from '../motion/PageTransition'

const navigationItems = [
  { 
    to: '/', 
    label: '训练', 
    end: true,
    icon: (isActive: boolean) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5z"/>
        <line x1="10" y1="11" x2="14" y2="11"/>
        <line x1="10" y1="15" x2="14" y2="15"/>
      </svg>
    )
  },
  { 
    to: '/templates', 
    label: '模板', 
    end: false,
    icon: (isActive: boolean) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6"/>
        <line x1="8" y1="12" x2="21" y2="12"/>
        <line x1="8" y1="18" x2="21" y2="18"/>
        <line x1="3" y1="6" x2="3.01" y2="6"/>
        <line x1="3" y1="12" x2="3.01" y2="12"/>
        <line x1="3" y1="18" x2="3.01" y2="18"/>
      </svg>
    )
  },
  { 
    to: '/summary', 
    label: '总结', 
    end: false,
    icon: (isActive: boolean) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={isActive ? "2.5" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6" y1="20" x2="6" y2="14"/>
      </svg>
    )
  },
]

export function AppLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const hideNavigation =
    location.pathname.startsWith('/exercise/') || location.pathname.startsWith('/calendar')

  function handleNavigationClick(event: MouseEvent<HTMLAnchorElement>, to: string) {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()

    if (location.pathname === to) {
      return
    }
    
    navigate(to)
  }

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)] selection:bg-[var(--primary-container)] selection:text-[var(--on-primary-container)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[30rem] flex-col relative">
        <main
          className={[
            'flex-1 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]',
            hideNavigation
              ? 'pb-[max(1rem,env(safe-area-inset-bottom))]'
              : 'pb-[calc(5rem+env(safe-area-inset-bottom))]',
          ].join(' ')}
        >
          <PageTransition />
        </main>
        
        {!hideNavigation ? (
          <nav className="fixed inset-x-0 bottom-0 z-40 bg-[var(--surface-container)] border-t border-[var(--outline-variant)]/30">
            <div className="mx-auto max-w-[30rem] pb-[env(safe-area-inset-bottom)]">
              <div className="flex h-20">
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    onClick={(event) => handleNavigationClick(event, item.to)}
                    className="flex-1 flex flex-col items-center justify-center gap-1 tap-highlight-transparent focus-visible:outline-none"
                  >
                    {({ isActive }) => (
                      <>
                        <div className={[
                          'flex h-8 px-5 items-center justify-center rounded-full transition-colors duration-200',
                          isActive
                            ? 'active-nav-pill bg-[var(--primary-container)] text-[var(--on-primary-container)]'
                            : 'text-[var(--on-surface-variant)] hover:bg-[var(--on-surface-variant)]/10'
                        ].join(' ')}>
                          {item.icon(isActive)}
                        </div>
                        <span className={[
                          'text-xs font-medium tracking-wide transition-colors duration-200',
                          isActive ? 'text-[var(--on-surface)]' : 'text-[var(--on-surface-variant)]'
                        ].join(' ')}>
                          {item.label}
                        </span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          </nav>
        ) : null}
      </div>
    </div>
  )
}
