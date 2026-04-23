import { NavLink, Outlet, useMatches } from 'react-router-dom'

const navigation = [
  { to: '/', label: '安排', end: true },
  { to: '/templates', label: '模板', end: false },
]

type RouteHandle = {
  title?: string
}

export function AppLayout() {
  const matches = useMatches()
  const currentMatch = [...matches].reverse().find((match) => {
    const handle = match.handle as RouteHandle | undefined
    return Boolean(handle?.title)
  })
  const title = (currentMatch?.handle as RouteHandle | undefined)?.title ?? '训练间歇记录器'

  return (
    <div className="min-h-screen bg-[var(--color-app-bg)] text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="sticky top-0 z-10 rounded-b-3xl border border-white/70 bg-white/85 px-4 py-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">TrainRe</p>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-slate-950">{title}</h1>
              <p className="mt-1 text-sm text-slate-500">极简力量训练记录 PWA 脚手架</p>
            </div>
            <nav className="flex items-center gap-2 rounded-full bg-slate-100 p-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'rounded-full px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-slate-950 text-white' : 'text-slate-600',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
