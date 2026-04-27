import {
  lazy,
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react'
import useEmblaCarousel from 'embla-carousel-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'

import { usePrimaryTabSwipeLock } from './PrimaryTabSwipeContext'
import { PrimaryTabSwipeProvider } from './PrimaryTabSwipeProvider'

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

const PRIMARY_TAB_SNAP_DURATION = 28
const PRIMARY_TAB_CONTENT_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const

function getPrimaryTabIndex(pathname: string) {
  return primaryTabs.findIndex((tab) => tab.pathname === pathname)
}

export function PrimaryTabPanels() {
  return (
    <PrimaryTabSwipeProvider>
      <PrimaryTabPanelsContent />
    </PrimaryTabSwipeProvider>
  )
}

function PrimaryTabPanelsContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const shouldReduceMotion = useReducedMotion() === true
  const { isPrimaryTabSwipeDisabled } = usePrimaryTabSwipeLock()
  const activeIndex = getPrimaryTabIndex(location.pathname)
  const activeTabIndex = activeIndex === -1 ? 0 : activeIndex
  const [selectedIndex, setSelectedIndex] = useState(activeTabIndex)
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: false,
    dragFree: false,
    dragThreshold: 4,
    duration: shouldReduceMotion ? 0 : PRIMARY_TAB_SNAP_DURATION,
    skipSnaps: false,
    startIndex: activeTabIndex,
    watchDrag: !isPrimaryTabSwipeDisabled,
  })

  useEffect(() => {
    if (!emblaApi) {
      return
    }

    setSelectedIndex(activeTabIndex)
    emblaApi.scrollTo(activeTabIndex, shouldReduceMotion)
  }, [activeTabIndex, emblaApi, shouldReduceMotion])

  useEffect(() => {
    if (!emblaApi || !isPrimaryTabSwipeDisabled) {
      return
    }

    emblaApi.scrollTo(activeTabIndex, true)
  }, [activeTabIndex, emblaApi, isPrimaryTabSwipeDisabled])

  const handleSelect = useCallback(() => {
    if (!emblaApi) {
      return
    }

    const nextIndex = emblaApi.selectedScrollSnap()
    setSelectedIndex(nextIndex)

    if (nextIndex === activeTabIndex) {
      return
    }

    startTransition(() => {
      navigate(primaryTabs[nextIndex].pathname)
    })
  }, [activeTabIndex, emblaApi, navigate])

  useEffect(() => {
    if (!emblaApi) {
      return
    }

    emblaApi.on('select', handleSelect)
    return () => {
      emblaApi.off('select', handleSelect)
    }
  }, [emblaApi, handleSelect])

  return (
    <div ref={emblaRef} className="scrollbar-hide h-full overflow-hidden">
      <div className="flex h-full touch-pan-y">
        {primaryTabs.map((tab, index) => {
          const isActive = index === activeIndex
          const isNearby = Math.abs(index - activeTabIndex) <= 1
          const isSelected = index === selectedIndex

          return (
            <PrimaryTabPanel key={tab.pathname} isActive={isActive} isSelected={isSelected}>
              {isNearby ? <Suspense fallback={null}>{tab.element}</Suspense> : null}
            </PrimaryTabPanel>
          )
        })}
      </div>
    </div>
  )
}

function PrimaryTabPanel({
  children,
  isActive,
  isSelected,
}: PropsWithChildren<{ isActive: boolean; isSelected: boolean }>) {
  return (
    <motion.section
      aria-hidden={!isActive}
      animate={
        isSelected
          ? { opacity: 1, scale: 1, y: 0 }
          : { opacity: 0.86, scale: 0.985, y: 4 }
      }
      className="scrollbar-hide h-full min-w-0 shrink-0 grow-0 basis-full overflow-x-hidden overflow-y-auto"
      initial={false}
      style={{
        contain: 'layout paint',
        pointerEvents: isActive ? 'auto' : 'none',
        touchAction: 'pan-y',
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      }}
      transition={PRIMARY_TAB_CONTENT_TRANSITION}
    >
      {children}
    </motion.section>
  )
}
