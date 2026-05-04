import {
  lazy,
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react'
import type { EmblaCarouselType } from 'embla-carousel'
import useEmblaCarousel from 'embla-carousel-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'

import { usePrimaryTabSwipeLock } from './PrimaryTabSwipeContext'
import { PrimaryTabSwipeProvider } from './PrimaryTabSwipeProvider'

const SchedulePage = lazy(() =>
  import('../../pages/SchedulePage').then((module) => ({ default: module.SchedulePage })),
)
const PlansPage = lazy(() =>
  import('../../pages/PlansPage').then((module) => ({ default: module.PlansPage })),
)
const SummaryPage = lazy(() =>
  import('../../pages/SummaryPage').then((module) => ({ default: module.SummaryPage })),
)

const primaryTabs = [
  { pathname: '/', element: <SchedulePage /> },
  { pathname: '/plans', element: <PlansPage /> },
  { pathname: '/summary', element: <SummaryPage /> },
]

const PRIMARY_TAB_SNAP_DURATION = 28
const PRIMARY_TAB_CONTENT_TRANSITION = {
  duration: 0.18,
  ease: [0.22, 1, 0.36, 1],
} as const
const PRIMARY_TAB_SWIPE_LOCK_SELECTOR = '[data-primary-tab-swipe-lock="true"]'

function getPrimaryTabIndex(pathname: string) {
  return primaryTabs.findIndex((tab) => tab.pathname === pathname)
}

function snapPrimaryTabToIndex(
  emblaApi: EmblaCarouselType,
  index: number,
  shouldScrollTo = true,
) {
  const engine = emblaApi.internalEngine()
  const snap = engine.scrollSnaps[index]

  if (snap === undefined) {
    return
  }

  engine.animation.stop()
  engine.index.set(index)
  engine.indexPrevious.set(index)
  engine.location.set(snap)
  engine.offsetLocation.set(snap)
  engine.previousLocation.set(snap)
  engine.target.set(snap)
  engine.translate.to(snap)

  if (shouldScrollTo) {
    emblaApi.scrollTo(index, true)
  }
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
  const { isPrimaryTabSwipeDisabled, primaryTabSwipeDisabledRef } = usePrimaryTabSwipeLock()
  const wasPrimaryTabSwipeDisabledRef = useRef(false)
  const activeIndex = getPrimaryTabIndex(location.pathname)
  const activeTabIndex = activeIndex === -1 ? 0 : activeIndex
  const watchDrag = useCallback(
    (_emblaApi: EmblaCarouselType, event: MouseEvent | TouchEvent) => {
      if (primaryTabSwipeDisabledRef.current) {
        return false
      }

      return !(
        event.target instanceof Element &&
        event.target.closest(PRIMARY_TAB_SWIPE_LOCK_SELECTOR)
      )
    },
    [primaryTabSwipeDisabledRef],
  )
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: 'start',
    containScroll: false,
    dragFree: false,
    dragThreshold: 4,
    duration: shouldReduceMotion ? 0 : PRIMARY_TAB_SNAP_DURATION,
    skipSnaps: false,
    startIndex: activeTabIndex,
    watchDrag,
  })
  const subscribeSelectedIndex = useCallback(
    (onStoreChange: () => void) => {
      if (!emblaApi) {
        return () => {}
      }

      emblaApi.on('select', onStoreChange)
      emblaApi.on('reInit', onStoreChange)
      return () => {
        emblaApi.off('select', onStoreChange)
        emblaApi.off('reInit', onStoreChange)
      }
    },
    [emblaApi],
  )
  const getSelectedIndex = useCallback(
    () => emblaApi?.selectedScrollSnap() ?? activeTabIndex,
    [activeTabIndex, emblaApi],
  )
  const selectedIndex = useSyncExternalStore(
    subscribeSelectedIndex,
    getSelectedIndex,
    getSelectedIndex,
  )

  useEffect(() => {
    if (!emblaApi) {
      return
    }

    emblaApi.scrollTo(activeTabIndex, shouldReduceMotion)
  }, [activeTabIndex, emblaApi, shouldReduceMotion])

  useLayoutEffect(() => {
    if (!emblaApi || !isPrimaryTabSwipeDisabled) {
      return
    }

    wasPrimaryTabSwipeDisabledRef.current = true
    emblaApi.reInit({ startIndex: activeTabIndex })
    snapPrimaryTabToIndex(emblaApi, activeTabIndex)
  }, [activeTabIndex, emblaApi, isPrimaryTabSwipeDisabled])

  useLayoutEffect(() => {
    if (!emblaApi || isPrimaryTabSwipeDisabled || !wasPrimaryTabSwipeDisabledRef.current) {
      return
    }

    wasPrimaryTabSwipeDisabledRef.current = false
    snapPrimaryTabToIndex(emblaApi, activeTabIndex)
  }, [activeTabIndex, emblaApi, isPrimaryTabSwipeDisabled])

  useLayoutEffect(() => {
    if (!emblaApi || !isPrimaryTabSwipeDisabled) {
      return
    }

    const keepCurrentTabSnapped = () => {
      snapPrimaryTabToIndex(emblaApi, activeTabIndex, false)
    }

    emblaApi.on('scroll', keepCurrentTabSnapped)
    return () => {
      emblaApi.off('scroll', keepCurrentTabSnapped)
    }
  }, [activeTabIndex, emblaApi, isPrimaryTabSwipeDisabled])

  const handleSelect = useCallback(() => {
    if (!emblaApi) {
      return
    }

    const nextIndex = emblaApi.selectedScrollSnap()

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
      <div className="flex h-full">
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
        transformOrigin: 'center center',
        willChange: 'transform, opacity',
      }}
      transition={PRIMARY_TAB_CONTENT_TRANSITION}
    >
      {children}
    </motion.section>
  )
}
