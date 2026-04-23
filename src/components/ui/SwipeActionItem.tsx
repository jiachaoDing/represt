import { useEffect, useRef, useState, type PointerEvent, type PropsWithChildren } from 'react'

type SwipeActionItemProps = PropsWithChildren<{
  actionLabel: string
  disabled?: boolean
  onAction: () => void
  onLongPress?: () => void
}>

const ACTION_WIDTH = 80

export function SwipeActionItem({
  actionLabel,
  children,
  disabled,
  onAction,
  onLongPress,
}: SwipeActionItemProps) {
  const [offsetX, setOffsetX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const offsetRef = useRef(0)
  const longPressTriggeredRef = useRef(false)
  const movedRef = useRef(false)
  const longPressTimerRef = useRef<number | null>(null)

  useEffect(() => {
    offsetRef.current = offsetX
  }, [offsetX])

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (disabled) {
      return
    }

    startXRef.current = event.clientX
    startYRef.current = event.clientY
    longPressTriggeredRef.current = false
    movedRef.current = false
    setDragging(true)

    if (onLongPress) {
      longPressTimerRef.current = window.setTimeout(() => {
        if (!movedRef.current) {
          longPressTriggeredRef.current = true
          setOffsetX(0)
          onLongPress()
        }
      }, 480)
    }
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragging || disabled) {
      return
    }

    const deltaX = event.clientX - startXRef.current
    const deltaY = event.clientY - startYRef.current

    if (Math.abs(deltaX) > 6 || Math.abs(deltaY) > 6) {
      movedRef.current = true
      clearLongPressTimer()
    }

    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
      return
    }

    const nextOffset = Math.max(-ACTION_WIDTH, Math.min(0, deltaX + offsetRef.current))
    setOffsetX(nextOffset)
  }

  function finishSwipe() {
    clearLongPressTimer()
    setDragging(false)
    setOffsetX((current) => (current < -40 ? -ACTION_WIDTH : 0))
  }

  return (
    <div
      onContextMenu={(event) => {
        if (!onLongPress || disabled) {
          return
        }

        event.preventDefault()
        longPressTriggeredRef.current = true
        onLongPress()
      }}
      onClickCapture={(event) => {
        if (longPressTriggeredRef.current) {
          event.preventDefault()
          event.stopPropagation()
          longPressTriggeredRef.current = false
        }
      }}
      className="relative overflow-hidden w-full group"
    >
      <div className="absolute inset-y-0 right-0 flex w-[80px] items-stretch justify-end">
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOffsetX(0)
            onAction()
          }}
          className="flex w-full items-center justify-center bg-[var(--error)] text-[var(--on-error)] transition-colors active:bg-[var(--error)]/80"
          aria-label={actionLabel}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
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
        className="w-full bg-[var(--surface)] relative z-10"
      >
        {children}
      </div>
    </div>
  )
}
