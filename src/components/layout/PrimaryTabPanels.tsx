import {
  lazy,
  Suspense,
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

import { quickEaseTransition } from '../motion/motion-tokens'
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

const PAGE_SWIPE_THRESHOLD = 72
const PAGE_DRAG_TOLERANCE = 10
const PAGE_SWIPE_VELOCITY = 520
const EDGE_RESISTANCE = 0.22

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
  const dragControls = useDragControls()
  const reduceMotion = useReducedMotion()
  const x = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const trackAnimationRef = useRef<{ stop: () => void } | null>(null)
  const didSwipeRef = useRef(false)
  const isPointerDownRef = useRef(false)
  const isPageDragStartedRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const { isPrimaryTabSwipeDisabled, primaryTabSwipeDisabledRef } = usePrimaryTabSwipeLock()
  const activeIndex = getPrimaryTabIndex(location.pathname)
  const activeTabIndex = activeIndex === -1 ? 0 : activeIndex
  const [displayIndex, setDisplayIndex] = useState(activeTabIndex)
  const [containerWidth, setContainerWidth] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    if (activeIndex !== -1 && !isDragging) {
      setDisplayIndex(activeIndex)
    }
  }, [activeIndex, isDragging])

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
    settleToIndex(displayIndex)
  }, [containerWidth, displayIndex])

  useEffect(() => {
    if (isPrimaryTabSwipeDisabled) {
      setIsDragging(false)
      settleToIndex(activeTabIndex)
    }
  }, [activeTabIndex, isPrimaryTabSwipeDisabled])

  useEffect(() => {
    return () => trackAnimationRef.current?.stop()
  }, [])

  function resetPointerIntent() {
    isPointerDownRef.current = false
    isPageDragStartedRef.current = false
  }

  function getPageX(index: number) {
    return -index * containerWidth
  }

  function settleToIndex(index: number) {
    const targetX = getPageX(index)
    trackAnimationRef.current?.stop()

    if (reduceMotion || containerWidth === 0) {
      x.set(targetX)
      return
    }

    trackAnimationRef.current = animate(x, targetX, quickEaseTransition)
  }

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

    if (Math.abs(deltaX) < PAGE_DRAG_TOLERANCE) {
      return
    }

    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      resetPointerIntent()
      return
    }

    isPageDragStartedRef.current = true
    trackAnimationRef.current?.stop()
    setDisplayIndex(activeTabIndex)
    dragControls.start(event)
  }

  function handleDragStart() {
    setIsDragging(true)
    didSwipeRef.current = true
  }

  function handleDrag() {
    if (isSwipeDisabled()) {
      x.set(getPageX(activeTabIndex))
    }
  }

  function handleDragEnd(
    _: globalThis.MouseEvent | globalThis.TouchEvent | globalThis.PointerEvent,
    info: PanInfo,
  ) {
    setIsDragging(false)
    resetPointerIntent()

    if (isSwipeDisabled()) {
      setDisplayIndex(activeTabIndex)
      settleToIndex(activeTabIndex)
      return
    }

    const shouldMoveNext =
      info.offset.x < -PAGE_SWIPE_THRESHOLD || info.velocity.x < -PAGE_SWIPE_VELOCITY
    const shouldMovePrevious =
      info.offset.x > PAGE_SWIPE_THRESHOLD || info.velocity.x > PAGE_SWIPE_VELOCITY
    const nextIndex = shouldMoveNext
      ? Math.min(activeTabIndex + 1, primaryTabs.length - 1)
      : shouldMovePrevious
        ? Math.max(activeTabIndex - 1, 0)
        : activeTabIndex

    setDisplayIndex(nextIndex)
    settleToIndex(nextIndex)

    if (nextIndex !== activeTabIndex) {
      navigate(primaryTabs[nextIndex].pathname)
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

          return (
            <section
              key={tab.pathname}
              aria-hidden={!isActive}
              className="scrollbar-hide h-full w-full shrink-0 overflow-x-hidden overflow-y-auto"
              style={{
                pointerEvents: isActive ? 'auto' : 'none',
                touchAction: 'pan-y',
              }}
            >
              <Suspense fallback={null}>{tab.element}</Suspense>
            </section>
          )
        })}
      </motion.div>
    </div>
  )
}
