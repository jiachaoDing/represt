import {
  lazy,
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  animate,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  type PanInfo,
} from 'framer-motion'
import { useLocation, useNavigate } from 'react-router-dom'

import { primaryTabSpringTransition } from '../motion/motion-tokens'
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

const PAGE_DRAG_TOLERANCE = 6
const PAGE_DIRECTION_LOCK_DISTANCE = 14
const PAGE_VERTICAL_INTENT_RATIO = 1.2
const PAGE_SWIPE_DISTANCE_RATIO = 0.16
const PAGE_MIN_SWIPE_THRESHOLD = 48
const PAGE_MAX_SWIPE_THRESHOLD = 88
const PAGE_SWIPE_VELOCITY = 460
const PAGE_VELOCITY_PROJECTION = 0.16
const EDGE_RESISTANCE = 0.18

function getPrimaryTabIndex(pathname: string) {
  return primaryTabs.findIndex((tab) => tab.pathname === pathname)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getSwipeThreshold(containerWidth: number) {
  return clamp(
    containerWidth * PAGE_SWIPE_DISTANCE_RATIO,
    PAGE_MIN_SWIPE_THRESHOLD,
    PAGE_MAX_SWIPE_THRESHOLD,
  )
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
  const dragControls = useDragControls()
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const trackAnimationRef = useRef<{ stop: () => void } | null>(null)
  const settleTargetXRef = useRef<number | null>(null)
  const didSwipeRef = useRef(false)
  const isPointerDownRef = useRef(false)
  const isPageDragStartedRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const { isPrimaryTabSwipeDisabled, primaryTabSwipeDisabledRef } = usePrimaryTabSwipeLock()
  const activeIndex = getPrimaryTabIndex(location.pathname)
  const activeTabIndex = activeIndex === -1 ? 0 : activeIndex
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }
    const observedElement = element

    function updateWidth() {
      setContainerWidth(observedElement.clientWidth)
    }

    updateWidth()
    const observer = new ResizeObserver(updateWidth)
    observer.observe(observedElement)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    return () => trackAnimationRef.current?.stop()
  }, [])

  function resetPointerIntent() {
    isPointerDownRef.current = false
    isPageDragStartedRef.current = false
  }

  const settleToIndex = useCallback((index: number) => {
    const targetX = -index * containerWidth
    const currentX = x.get()

    if (settleTargetXRef.current === targetX && Math.abs(currentX - targetX) > 0.5) {
      return
    }

    trackAnimationRef.current?.stop()
    settleTargetXRef.current = targetX

    if (reduceMotion || containerWidth === 0 || Math.abs(currentX - targetX) <= 0.5) {
      x.set(targetX)
      return
    }

    trackAnimationRef.current = animate(x, targetX, primaryTabSpringTransition)
  }, [containerWidth, reduceMotion, x])

  useEffect(() => {
    settleToIndex(activeTabIndex)
  }, [activeTabIndex, containerWidth, settleToIndex])

  useEffect(() => {
    if (isPrimaryTabSwipeDisabled) {
      settleToIndex(activeTabIndex)
    }
  }, [activeTabIndex, isPrimaryTabSwipeDisabled, settleToIndex])

  function isSwipeDisabled() {
    return primaryTabSwipeDisabledRef.current
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    if (isSwipeDisabled() || containerWidth === 0) {
      settleToIndex(activeTabIndex)
      return
    }

    isPointerDownRef.current = true
    isPageDragStartedRef.current = false
    startXRef.current = event.clientX
    startYRef.current = event.clientY
    didSwipeRef.current = false
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!isPointerDownRef.current || isPageDragStartedRef.current) {
      return
    }

    if (isSwipeDisabled() || containerWidth === 0) {
      resetPointerIntent()
      settleToIndex(activeTabIndex)
      return
    }

    const deltaX = event.clientX - startXRef.current
    const deltaY = event.clientY - startYRef.current
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)

    if (absX < PAGE_DRAG_TOLERANCE && absY < PAGE_DRAG_TOLERANCE) {
      return
    }

    if (absY >= PAGE_DIRECTION_LOCK_DISTANCE && absY > absX * PAGE_VERTICAL_INTENT_RATIO) {
      resetPointerIntent()
      return
    }

    if (absX < PAGE_DRAG_TOLERANCE || absY > absX * PAGE_VERTICAL_INTENT_RATIO) {
      return
    }

    isPageDragStartedRef.current = true
    trackAnimationRef.current?.stop()
    settleTargetXRef.current = null
    dragControls.start(event)
  }

  function handleDragStart() {
    settleTargetXRef.current = null
    didSwipeRef.current = true
  }

  function handleDrag() {
    if (isSwipeDisabled()) {
      x.set(-activeTabIndex * containerWidth)
    }
  }

  function handleDragEnd(
    _: globalThis.MouseEvent | globalThis.TouchEvent | globalThis.PointerEvent,
    info: PanInfo,
  ) {
    resetPointerIntent()

    if (isSwipeDisabled()) {
      settleToIndex(activeTabIndex)
      return
    }

    const swipeThreshold = getSwipeThreshold(containerWidth)
    const projectedOffset = info.offset.x + info.velocity.x * PAGE_VELOCITY_PROJECTION
    const shouldMoveNext =
      projectedOffset < -swipeThreshold || info.velocity.x < -PAGE_SWIPE_VELOCITY
    const shouldMovePrevious =
      projectedOffset > swipeThreshold || info.velocity.x > PAGE_SWIPE_VELOCITY
    const nextIndex = shouldMoveNext
      ? Math.min(activeTabIndex + 1, primaryTabs.length - 1)
      : shouldMovePrevious
        ? Math.max(activeTabIndex - 1, 0)
        : activeTabIndex

    settleToIndex(nextIndex)

    if (nextIndex !== activeTabIndex) {
      startTransition(() => {
        navigate(primaryTabs[nextIndex].pathname)
      })
    }
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (!didSwipeRef.current) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    didSwipeRef.current = false
  }

  return (
    <div
      ref={containerRef}
      className="scrollbar-hide h-full overflow-x-hidden"
      onClickCapture={handleClickCapture}
      onPointerCancel={resetPointerIntent}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={resetPointerIntent}
      style={{ touchAction: 'pan-y' }}
    >
      <motion.div
        drag={isPrimaryTabSwipeDisabled ? false : 'x'}
        dragControls={dragControls}
        dragConstraints={{
          left: -(primaryTabs.length - 1) * containerWidth,
          right: 0,
        }}
        dragDirectionLock
        dragElastic={EDGE_RESISTANCE}
        dragListener={false}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        onDragStart={handleDragStart}
        className="flex h-full w-full will-change-transform"
        style={{ x }}
      >
        {primaryTabs.map((tab, index) => {
          const isActive = index === activeIndex
          const isNearby = Math.abs(index - activeTabIndex) <= 1

          return (
            <section
              key={tab.pathname}
              aria-hidden={!isActive}
              className="scrollbar-hide h-full w-full shrink-0 overflow-x-hidden overflow-y-auto"
              style={{
                contain: 'layout paint',
                pointerEvents: isActive ? 'auto' : 'none',
                touchAction: 'pan-y',
              }}
            >
              {isNearby ? <Suspense fallback={null}>{tab.element}</Suspense> : null}
            </section>
          )
        })}
      </motion.div>
    </div>
  )
}
