import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type PropsWithChildren,
} from 'react'

type SwipeActionItemProps = PropsWithChildren<{
  actionLabel: string
  requireLongPress?: boolean
  disabled?: boolean
  onAction: () => void
}>

const ACTION_WIDTH = 80
const LONG_PRESS_MS = 240
const MOVE_TOLERANCE = 8
const ACTION_THRESHOLD = 56

function DeleteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  )
}

export function SwipeActionItem({
  actionLabel,
  children,
  disabled,
  onAction,
  requireLongPress = false,
}: SwipeActionItemProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const startOffsetRef = useRef(0)
  const offsetRef = useRef(0)
  const isArmedRef = useRef(!requireLongPress)
  const didSwipeActionRef = useRef(false)
  const longPressTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    offsetRef.current = offsetX
  }, [offsetX])

  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current !== null) {
        window.clearTimeout(longPressTimeoutRef.current)
      }
      setPageSwipeLocked(false)
    }
  }, [])

  function setPageSwipeLocked(locked: boolean) {
    window.dispatchEvent(new CustomEvent('trainre:swipe-action-lock', { detail: locked }))
  }

  function clearLongPressTimer() {
    if (longPressTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(longPressTimeoutRef.current)
    longPressTimeoutRef.current = null
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) {
      return
    }

    startXRef.current = event.clientX
    startYRef.current = event.clientY
    startOffsetRef.current = offsetRef.current
    isArmedRef.current = !requireLongPress
    didSwipeActionRef.current = false
    setDragging(true)

    if (requireLongPress) {
      longPressTimeoutRef.current = window.setTimeout(() => {
        longPressTimeoutRef.current = null
        isArmedRef.current = true
        setPageSwipeLocked(true)
      }, LONG_PRESS_MS)
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging || disabled) {
      return
    }

    const deltaX = event.clientX - startXRef.current
    const deltaY = event.clientY - startYRef.current

    if (!isArmedRef.current) {
      if (Math.hypot(deltaX, deltaY) > MOVE_TOLERANCE) {
        clearLongPressTimer()
        setDragging(false)
      }
      return
    }

    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      return
    }

    const minOffset = requireLongPress ? -ACTION_WIDTH : -ACTION_WIDTH
    const maxOffset = requireLongPress ? ACTION_WIDTH : 0
    const nextOffset = Math.max(minOffset, Math.min(maxOffset, deltaX + startOffsetRef.current))
    offsetRef.current = nextOffset
    didSwipeActionRef.current = requireLongPress && Math.abs(nextOffset) > MOVE_TOLERANCE
    setOffsetX(nextOffset)
  }

  function finishSwipe() {
    const currentOffset = offsetRef.current

    clearLongPressTimer()
    setPageSwipeLocked(false)
    setDragging(false)
    isArmedRef.current = !requireLongPress
    offsetRef.current = requireLongPress ? 0 : currentOffset < -40 ? -ACTION_WIDTH : 0
    setOffsetX(offsetRef.current)

    if (requireLongPress && Math.abs(currentOffset) > ACTION_THRESHOLD) {
      onAction()
    }
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!didSwipeActionRef.current) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    didSwipeActionRef.current = false
  }

  return (
    <div
      className="relative w-full overflow-hidden"
      data-page-swipe-block={requireLongPress ? 'true' : undefined}
      onClickCapture={handleClickCapture}
    >
      {requireLongPress ? (
        <div className="absolute inset-y-0 left-0 flex w-[80px] items-center justify-center bg-[var(--error)] text-[var(--on-error)]">
          <DeleteIcon />
        </div>
      ) : null}
      <div className="absolute inset-y-0 right-0 flex w-[80px] items-stretch justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            offsetRef.current = 0
            setOffsetX(0)
            onAction()
          }}
          className="flex w-full items-center justify-center bg-[var(--error)] text-[var(--on-error)] transition-colors active:bg-[var(--error)]/80"
          aria-label={actionLabel}
        >
          <DeleteIcon />
        </button>
      </div>
      <div
        onPointerCancel={finishSwipe}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishSwipe}
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: dragging ? 'none' : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)',
          touchAction: 'pan-y',
        }}
        className="relative z-10 w-full bg-[var(--surface)]"
      >
        {children}
      </div>
    </div>
  )
}
