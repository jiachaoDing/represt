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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header className="border-b border-slate-200 py-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">TrainRe</p>
              <h1 className="text-2xl font-semibold">{title}</h1>
            </div>
            <nav className="flex gap-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    [
                      'rounded border px-3 py-2 text-sm',
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-300 text-slate-700',
                    ].join(' ')
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>
        <main className="flex-1 py-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
