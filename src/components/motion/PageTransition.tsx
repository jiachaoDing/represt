import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'

import { pageSpringTransition, quickEaseTransition } from './motion-tokens'
import { isPrimaryTabPath, PrimaryTabPanels } from '../layout/PrimaryTabPanels'

type TransitionMode = 'tab' | 'stack'

type TransitionState = {
  direction: number
  mode: TransitionMode
}

function getPrimaryTabIndex(pathname: string) {
  if (pathname === '/') {
    return 0
  }

  if (pathname === '/templates') {
    return 1
  }

  if (pathname === '/summary') {
    return 2
  }

  return -1
}

function getRouteDepth(pathname: string) {
  return pathname.split('/').filter(Boolean).length
}

function getTransitionState(previousPathname: string, pathname: string): TransitionState {
  const previousTabIndex = getPrimaryTabIndex(previousPathname)
  const nextTabIndex = getPrimaryTabIndex(pathname)

  if (previousTabIndex !== -1 && nextTabIndex !== -1) {
    if (previousTabIndex === nextTabIndex) {
      return { direction: 0, mode: 'tab' }
    }

    return {
      direction: nextTabIndex > previousTabIndex ? 1 : -1,
      mode: 'tab',
    }
  }

  const previousDepth = getRouteDepth(previousPathname)
  const nextDepth = getRouteDepth(pathname)

  if (previousDepth === nextDepth) {
    return { direction: 0, mode: 'stack' }
  }

  return {
    direction: nextDepth > previousDepth ? 1 : -1,
    mode: 'stack',
  }
}

function getInitialState(transitionState: TransitionState, reduceMotion: boolean) {
  if (reduceMotion) {
    return { opacity: 0 }
  }

  if (transitionState.mode === 'tab') {
    return {
      opacity: 0.98,
      x: transitionState.direction >= 0 ? 42 : -42,
    }
  }

  if (transitionState.direction === 0) {
    return { opacity: 0, y: 10 }
  }

  return {
    opacity: 0.98,
    x: transitionState.direction > 0 ? 24 : -18,
  }
}

function getAnimateState(transitionState: TransitionState, reduceMotion: boolean) {
  return {
    opacity: 1,
    x: 0,
    y: 0,
    transition:
      reduceMotion || transitionState.mode === 'tab'
        ? quickEaseTransition
        : pageSpringTransition,
  }
}

function getExitState(transitionState: TransitionState, reduceMotion: boolean) {
  if (reduceMotion) {
    return { opacity: 0, transition: quickEaseTransition }
  }

  if (transitionState.mode === 'tab') {
    return {
      opacity: 0.98,
      x: transitionState.direction >= 0 ? -42 : 42,
      transition: quickEaseTransition,
    }
  }

  if (transitionState.direction === 0) {
    return {
      opacity: 0,
      y: -6,
      transition: quickEaseTransition,
    }
  }

  return {
    opacity: 0.98,
    x: transitionState.direction > 0 ? -16 : 18,
    transition: quickEaseTransition,
  }
}

export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()
  const reduceMotion = useReducedMotion()
  const shouldReduceMotion = reduceMotion === true
  const previousPathnameRef = useRef(location.pathname)

  const transitionState = getTransitionState(previousPathnameRef.current, location.pathname)

  useEffect(() => {
    previousPathnameRef.current = location.pathname
  }, [location.pathname])

  if (isPrimaryTabPath(location.pathname)) {
    return <PrimaryTabPanels />
  }

  return (
    <div className="relative min-h-full overflow-x-hidden">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={location.pathname}
          initial={getInitialState(transitionState, shouldReduceMotion)}
          animate={getAnimateState(transitionState, shouldReduceMotion)}
          exit={getExitState(transitionState, shouldReduceMotion)}
          className="min-h-full w-full will-change-transform"
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
