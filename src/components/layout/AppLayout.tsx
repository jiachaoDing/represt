import { NavLink, Outlet, useLocation } from 'react-router-dom'

const navigationItems = [
  { 
    to: '/', 
    label: '安排', 
    end: true,
    icon: (isActive: boolean) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isActive ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    )
  },
  { 
    to: '/templates', 
    label: '模板', 
    end: false,
    icon: (isActive: boolean) => (
      <svg viewBox="0 0 24 24" width="24" height="24" fill={isActive ? "currentColor" : "none"} stroke="currentColor" strokeWidth={isActive ? "0" : "2"} strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    )
  },
]

export function AppLayout() {
  const location = useLocation()
  const hideNavigation = location.pathname.startsWith('/exercise/')

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
          <Outlet />
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
                    className="flex-1 flex flex-col items-center justify-center gap-1 tap-highlight-transparent"
                  >
                    {({ isActive }) => (
                      <>
                        <div className={[
                          'flex h-8 px-5 items-center justify-center rounded-full transition-colors duration-200',
                          isActive 
                            ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]' 
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
