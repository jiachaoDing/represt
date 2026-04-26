import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type PointerEvent,
  type PropsWithChildren,
  type SetStateAction,
} from 'react'

type PrimaryTabSwipeContextValue = {
  isPrimaryTabSwipeDisabled: boolean
  primaryTabSwipeDisabledRef: MutableRefObject<boolean>
  setPrimaryTabSwipeDisabled: Dispatch<SetStateAction<boolean>>
}

const noopSetPrimaryTabSwipeDisabled: Dispatch<SetStateAction<boolean>> = () => undefined
const noopPrimaryTabSwipeDisabledRef: MutableRefObject<boolean> = { current: false }
const PRIMARY_TAB_SWIPE_LOCK_DELAY = 320
const PRIMARY_TAB_SWIPE_LOCK_TOLERANCE = 8

const PrimaryTabSwipeContext = createContext<PrimaryTabSwipeContextValue>({
  isPrimaryTabSwipeDisabled: false,
  primaryTabSwipeDisabledRef: noopPrimaryTabSwipeDisabledRef,
  setPrimaryTabSwipeDisabled: noopSetPrimaryTabSwipeDisabled,
})

export function PrimaryTabSwipeProvider({ children }: PropsWithChildren) {
  const [isPrimaryTabSwipeDisabled, setPrimaryTabSwipeDisabled] = useState(false)
  const primaryTabSwipeDisabledRef = useRef(false)
  const setPrimaryTabSwipeDisabledValue = useCallback<Dispatch<SetStateAction<boolean>>>(
    (nextValue) => {
      setPrimaryTabSwipeDisabled((currentValue) => {
        const resolvedValue =
          typeof nextValue === 'function' ? nextValue(currentValue) : nextValue
        primaryTabSwipeDisabledRef.current = resolvedValue
        return resolvedValue
      })
    },
    [],
  )
  const value = useMemo(
    () => ({
      isPrimaryTabSwipeDisabled,
      primaryTabSwipeDisabledRef,
      setPrimaryTabSwipeDisabled: setPrimaryTabSwipeDisabledValue,
    }),
    [isPrimaryTabSwipeDisabled, setPrimaryTabSwipeDisabledValue],
  )

  return (
    <PrimaryTabSwipeContext.Provider value={value}>
      {children}
    </PrimaryTabSwipeContext.Provider>
  )
}

export function usePrimaryTabSwipeLock() {
  return useContext(PrimaryTabSwipeContext)
}

export function usePrimaryTabLongPressSwipeLock(isDisabled = false) {
  const { setPrimaryTabSwipeDisabled } = usePrimaryTabSwipeLock()
  const pressTimerRef = useRef<number | null>(null)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const didLockRef = useRef(false)

  function clearPressTimer() {
    if (pressTimerRef.current !== null) {
      clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
  }

  function releaseLock() {
    clearPressTimer()

    if (didLockRef.current) {
      didLockRef.current = false
      setPrimaryTabSwipeDisabled(false)
    }
  }

  function handlePointerDownCapture(event: PointerEvent<HTMLElement>) {
    if (isDisabled || (event.pointerType === 'mouse' && event.button !== 0)) {
      return
    }

    clearPressTimer()
    didLockRef.current = false
    startXRef.current = event.clientX
    startYRef.current = event.clientY
    pressTimerRef.current = window.setTimeout(() => {
      didLockRef.current = true
      setPrimaryTabSwipeDisabled(true)
      pressTimerRef.current = null
    }, PRIMARY_TAB_SWIPE_LOCK_DELAY)
  }

  function handlePointerMoveCapture(event: PointerEvent<HTMLElement>) {
    if (pressTimerRef.current === null) {
      return
    }

    const deltaX = event.clientX - startXRef.current
    const deltaY = event.clientY - startYRef.current

    if (
      Math.abs(deltaX) > PRIMARY_TAB_SWIPE_LOCK_TOLERANCE ||
      Math.abs(deltaY) > PRIMARY_TAB_SWIPE_LOCK_TOLERANCE
    ) {
      clearPressTimer()
    }
  }

  return {
    onPointerCancelCapture: releaseLock,
    onPointerDownCapture: handlePointerDownCapture,
    onPointerMoveCapture: handlePointerMoveCapture,
    onPointerUpCapture: releaseLock,
  }
}
