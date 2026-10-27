import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { preserveScrollPosition } from '../src/lib/scroll-position'

class ScrollViewport extends EventTarget {
  clientHeight = 400
  scrollHeight = 400
  private top = 0

  get scrollTop() {
    return this.top
  }

  set scrollTop(value: number) {
    const next = Math.max(0, Math.min(value, this.scrollHeight - this.clientHeight))
    if (next !== this.top) {
      this.top = next
      this.dispatchEvent(new Event('scroll'))
    }
  }
}

let notifyResize: () => void
const disconnect = vi.fn()

beforeEach(() => {
  disconnect.mockClear()
  notifyResize = () => {}
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) {
      notifyResize = callback
    }

    observe() {}
    disconnect = disconnect
  })
})

afterEach(() => vi.unstubAllGlobals())

function track(viewport: ScrollViewport, position: { top: number }) {
  return preserveScrollPosition(
    viewport as unknown as HTMLElement,
    {} as HTMLElement,
    position,
  )
}

it('restores the saved list position into a newly mounted viewport', () => {
  const position = { top: 0 }
  const original = new ScrollViewport()
  original.scrollHeight = 2000
  const leave = track(original, position)
  original.scrollTop = 900
  leave()

  const returned = new ScrollViewport()
  returned.scrollHeight = 2000
  const cleanup = track(returned, position)
  expect(returned.scrollTop).toBe(900)
  returned.scrollTop = 1100
  expect(position.top).toBe(1100)
  cleanup()
})

it('waits through empty and partially loaded content without losing the target', () => {
  const position = { top: 900 }
  const viewport = new ScrollViewport()
  const cleanup = track(viewport, position)
  expect(viewport.scrollTop).toBe(0)

  viewport.scrollHeight = 700
  notifyResize()
  expect(viewport.scrollTop).toBe(300)
  expect(position.top).toBe(900)
  expect(disconnect).not.toHaveBeenCalled()

  viewport.scrollHeight = 1800
  notifyResize()
  expect(viewport.scrollTop).toBe(900)
  expect(disconnect).toHaveBeenCalledOnce()
  cleanup()
})

it.each(['pointerdown', 'touchstart', 'wheel', 'keydown'])(
  'lets %s interrupt a pending restoration',
  (eventType) => {
    const position = { top: 900 }
    const viewport = new ScrollViewport()
    viewport.scrollHeight = 700
    const cleanup = track(viewport, position)
    viewport.dispatchEvent(new Event(eventType))
    viewport.scrollTop = 100

    viewport.scrollHeight = 1800
    notifyResize()
    expect(viewport.scrollTop).toBe(100)
    expect(position.top).toBe(100)
    cleanup()
  },
)

it('keeps an unfinished target across unmount and removes scroll listeners', () => {
  const position = { top: 900 }
  const viewport = new ScrollViewport()
  viewport.scrollHeight = 700
  const cleanup = track(viewport, position)
  cleanup()
  viewport.scrollTop = 0
  viewport.scrollHeight = 1800
  notifyResize()
  expect(viewport.scrollTop).toBe(0)
  expect(position.top).toBe(900)
  expect(disconnect).toHaveBeenCalledOnce()
})
