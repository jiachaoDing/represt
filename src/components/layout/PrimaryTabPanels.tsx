import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLocation } from 'react-router-dom'

const SchedulePage = lazy(() =>
  import('../../pages/SchedulePage').then((module) => ({ default: module.SchedulePage })),
)
const TemplatesPage = lazy(() =>
  import('../../pages/TemplatesPage').then((module) => ({ default: module.TemplatesPage })),
)
const SummaryPage = lazy(() =>
  import('../../pages/SummaryPage').then((module) => ({ default: module.SummaryPage })),
)

const primaryTabs = [
  { pathname: '/', element: <SchedulePage /> },
  { pathname: '/templates', element: <TemplatesPage /> },
  { pathname: '/summary', element: <SummaryPage /> },
]

function getPrimaryTabIndex(pathname: string) {
  return primaryTabs.findIndex((tab) => tab.pathname === pathname)
}

export function isPrimaryTabPath(pathname: string) {
  return getPrimaryTabIndex(pathname) !== -1
}

export function PrimaryTabPanels() {
  const location = useLocation()
  const reduceMotion = useReducedMotion()
  const activeIndex = getPrimaryTabIndex(location.pathname)
  const previousIndexRef = useRef(activeIndex)
  const [measuredIndexes, setMeasuredIndexes] = useState(() => new Set([activeIndex]))
  const shouldReduceMotion = reduceMotion === true
  const transition = useMemo(
    () =>
      shouldReduceMotion
        ? { duration: 0 }
        : {
            type: 'spring' as const,
            stiffness: 380,
            damping: 38,
            mass: 0.82,
          },
    [shouldReduceMotion],
  )

  useEffect(() => {
    const previousIndex = previousIndexRef.current
    previousIndexRef.current = activeIndex

    if (previousIndex === activeIndex) {
      setMeasuredIndexes(new Set([activeIndex]))
      return
    }

    setMeasuredIndexes(new Set([previousIndex, activeIndex]))

    const timeoutId = window.setTimeout(
      () => setMeasuredIndexes(new Set([activeIndex])),
      shouldReduceMotion ? 0 : 280,
    )

    return () => window.clearTimeout(timeoutId)
  }, [activeIndex, shouldReduceMotion])

  return (
    <div className="min-h-full overflow-x-hidden">
      <motion.div
        animate={{ x: `${activeIndex * -100}%` }}
        className="flex min-h-full w-full will-change-transform"
        initial={false}
        transition={transition}
      >
        {primaryTabs.map((tab, index) => {
          const isActive = index === activeIndex
          const shouldMeasure = measuredIndexes.has(index)

          return (
            <section
              key={tab.pathname}
              aria-hidden={!isActive}
              className={[
                'w-full shrink-0',
                shouldMeasure ? 'min-h-full' : 'h-0 overflow-hidden',
              ].join(' ')}
              style={{ pointerEvents: isActive ? 'auto' : 'none' }}
            >
              <Suspense fallback={null}>{tab.element}</Suspense>
            </section>
          )
        })}
      </motion.div>
    </div>
  )
}
