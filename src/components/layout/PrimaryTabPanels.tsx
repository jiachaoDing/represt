import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

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
const EDGE_RESISTANCE = 0.22

function getPrimaryTabIndex(pathname: string) {
  return primaryTabs.findIndex((tab) => tab.pathname === pathname)
}

export function isPrimaryTabPath(pathname: string) {
  return getPrimaryTabIndex(pathname) !== -1
}

export function PrimaryTabPanels() {
  const location = useLocation()
  const navigate = useNavigate()
  const activeIndex = getPrimaryTabIndex(location.pathname)
  const [displayIndex, setDisplayIndex] = useState(activeIndex)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const isPointerDownRef = useRef(false)
  const isPageDraggingRef = useRef(false)
  const isSwipeActionLockedRef = useRef(false)
  const dragOffsetRef = useRef(0)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const didSwipeRef = useRef(false)

  useEffect(() => {
    if (activeIndex !== -1 && !isPointerDownRef.current) {
      setDisplayIndex(activeIndex)
    }
  }, [activeIndex])

  useEffect(() => {
    function handleSwipeActionLock(event: Event) {
      isSwipeActionLockedRef.current = Boolean((event as CustomEvent<boolean>).detail)

      if (isSwipeActionLockedRef.current) {
        isPageDraggingRef.current = false
        dragOffsetRef.current = 0
        setIsDragging(false)
        setDragOffset(0)
      }
    }

    window.addEventListener('trainre:swipe-action-lock', handleSwipeActionLock)
    return () => window.removeEventListener('trainre:swipe-action-lock', handleSwipeActionLock)
  }, [])

  function resetDragState() {
    isPointerDownRef.current = false
    isPageDraggingRef.current = false
    dragOffsetRef.current = 0
    setIsDragging(false)
    setDragOffset(0)
  }

  function getConstrainedOffset(deltaX: number) {
    const isAtFirstTab = activeIndex <= 0
    const isAtLastTab = activeIndex >= primaryTabs.length - 1

    if ((isAtFirstTab && deltaX > 0) || (isAtLastTab && deltaX < 0)) {
      return deltaX * EDGE_RESISTANCE
    }

    return deltaX
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return
    }

    isPointerDownRef.current = true
    isPageDraggingRef.current = false
    setDisplayIndex(activeIndex)
    startXRef.current = event.clientX
    startYRef.current = event.clientY
    didSwipeRef.current = false
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!isPointerDownRef.current || isSwipeActionLockedRef.current) {
      return
    }

    const deltaX = event.clientX - startXRef.current
    const deltaY = event.clientY - startYRef.current

    if (!isPageDraggingRef.current) {
      if (Math.abs(deltaX) < PAGE_DRAG_TOLERANCE) {
        return
      }

      if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        resetDragState()
        return
      }

      isPageDraggingRef.current = true
      setIsDragging(true)
    }

    didSwipeRef.current = true
    dragOffsetRef.current = getConstrainedOffset(deltaX)
    setDragOffset(dragOffsetRef.current)
  }

  function handlePointerUp() {
    if (!isPageDraggingRef.current || isSwipeActionLockedRef.current) {
      resetDragState()
      return
    }

    const currentDragOffset = dragOffsetRef.current
    const nextIndex =
      currentDragOffset < -PAGE_SWIPE_THRESHOLD
        ? Math.min(activeIndex + 1, primaryTabs.length - 1)
        : currentDragOffset > PAGE_SWIPE_THRESHOLD
          ? Math.max(activeIndex - 1, 0)
          : activeIndex

    resetDragState()
    setDisplayIndex(nextIndex)

    if (nextIndex !== activeIndex) {
      navigate(primaryTabs[nextIndex].pathname)
    }
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!didSwipeRef.current) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    didSwipeRef.current = false
  }

  return (
    <div
      className="min-h-full overflow-x-hidden"
      onClickCapture={handleClickCapture}
      onPointerCancel={resetDragState}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: 'pan-y' }}
    >
      <div
        className="flex min-h-full w-full will-change-transform"
        style={{
          transform: `translateX(calc(${displayIndex * -100}% + ${dragOffset}px))`,
          transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        {primaryTabs.map((tab, index) => {
          const isActive = index === activeIndex

          return (
            <section
              key={tab.pathname}
              aria-hidden={!isActive}
              className="min-h-full w-full shrink-0"
              style={{ pointerEvents: isActive ? 'auto' : 'none' }}
            >
              <Suspense fallback={null}>{tab.element}</Suspense>
            </section>
          )
        })}
      </div>
    </div>
  )
}
