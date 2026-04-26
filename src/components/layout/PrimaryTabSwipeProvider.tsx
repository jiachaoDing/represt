import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type PropsWithChildren,
  type SetStateAction,
} from 'react'

import { PrimaryTabSwipeContext } from './PrimaryTabSwipeContext'

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
