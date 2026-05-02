import { useEffect, useRef } from 'react'

type UseScrollToPendingExerciseOptions = {
  exerciseIds: string[]
  pendingScrollExerciseId: string | null
  onScrollAnimationComplete: () => void
}

export function useScrollToPendingExercise({
  exerciseIds,
  pendingScrollExerciseId,
  onScrollAnimationComplete,
}: UseScrollToPendingExerciseOptions) {
  const itemRefs = useRef(new Map<string, HTMLDivElement>())
  const handledScrollExerciseIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!pendingScrollExerciseId) {
      handledScrollExerciseIdRef.current = null
      return
    }

    if (handledScrollExerciseIdRef.current === pendingScrollExerciseId) {
      return
    }

    const element = itemRefs.current.get(pendingScrollExerciseId)
    if (!element) {
      return
    }

    handledScrollExerciseIdRef.current = pendingScrollExerciseId
    window.requestAnimationFrame(() => {
      element.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
      element.animate(
        [
          {
            transform: 'scale(0.98)',
            opacity: 0.75,
          },
          {
            transform: 'scale(1)',
            opacity: 1,
          },
        ],
        {
          duration: 320,
          easing: 'cubic-bezier(0.2, 0, 0, 1)',
        },
      )
      onScrollAnimationComplete()
    })
  }, [exerciseIds, onScrollAnimationComplete, pendingScrollExerciseId])

  function registerItemRef(exerciseId: string, element: HTMLDivElement | null) {
    if (element) {
      itemRefs.current.set(exerciseId, element)
      return
    }

    itemRefs.current.delete(exerciseId)
  }

  return {
    registerItemRef,
  }
}
