import { NavLink, Outlet, useLocation } from 'react-router-dom'

const navigationItems = [
  { to: '/', label: '安排', end: true },
  { to: '/templates', label: '模板', end: false },
]

export function AppLayout() {
  const location = useLocation()
  const hideNavigation = location.pathname.startsWith('/exercise/')

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--ink-primary)]">
      <div className="mx-auto flex min-h-screen w-full max-w-[30rem] flex-col">
        <main
          className={[
            'flex-1 px-4 pt-[max(0.75rem,env(safe-area-inset-top))]',
            hideNavigation
              ? 'pb-[max(1rem,env(safe-area-inset-bottom))]'
              : 'pb-[calc(5.75rem+env(safe-area-inset-bottom))]',
          ].join(' ')}
        >
          <Outlet />
        </main>
        {!hideNavigation ? (
          <nav className="fixed inset-x-0 bottom-0 z-40">
            <div className="mx-auto max-w-[30rem] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
              <div className="flex items-center justify-center gap-2 rounded-[1.75rem] border border-[var(--outline-soft)] bg-[var(--surface-raised)] px-3 py-2 shadow-[var(--shadow-soft)] backdrop-blur">
                {navigationItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      [
                        'min-w-[7rem] rounded-full px-4 py-3 text-center text-sm font-medium transition',
                        isActive
                          ? 'bg-[var(--surface-accent)] text-[var(--brand-strong)]'
                          : 'text-[var(--ink-secondary)]',
                      ].join(' ')
                    }
                  >
                    {item.label}
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
