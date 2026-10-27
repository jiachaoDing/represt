export type ScrollPosition = { top: number }

export function preserveScrollPosition(
  viewport: HTMLElement,
  content: HTMLElement,
  position: ScrollPosition,
) {
  let isRestoring = position.top > 0
  let observer: ResizeObserver | null = null

  const savePosition = () => {
    if (!isRestoring) {
      position.top = viewport.scrollTop
    }
  }

  const stopRestoring = () => {
    isRestoring = false
    observer?.disconnect()
    savePosition()
  }

  const restorePosition = () => {
    if (!isRestoring) {
      return
    }

    // The list may still be loading, so keep the target until it fits.
    viewport.scrollTop = position.top
    if (viewport.scrollHeight - viewport.clientHeight >= position.top) {
      stopRestoring()
    }
  }

  viewport.addEventListener('scroll', savePosition, { passive: true })
  viewport.addEventListener('pointerdown', stopRestoring, { passive: true })
  viewport.addEventListener('touchstart', stopRestoring, { passive: true })
  viewport.addEventListener('wheel', stopRestoring, { passive: true })
  viewport.addEventListener('keydown', stopRestoring)

  if (isRestoring) {
    observer = new ResizeObserver(restorePosition)
    observer.observe(content)
    restorePosition()
  }

  return () => {
    isRestoring = false
    observer?.disconnect()
    viewport.removeEventListener('scroll', savePosition)
    viewport.removeEventListener('pointerdown', stopRestoring)
    viewport.removeEventListener('touchstart', stopRestoring)
    viewport.removeEventListener('wheel', stopRestoring)
    viewport.removeEventListener('keydown', stopRestoring)
  }
}
