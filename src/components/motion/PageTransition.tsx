import { useEffect, useRef } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useLocation, useOutlet } from 'react-router-dom'

import { pageSpringTransition, quickEaseTransition } from './motion-tokens'
import { PrimaryTabPanels } from '../layout/PrimaryTabPanels'

type RouteLayer = 'primary' | 'detail' | 'feature' | 'other'
type TransitionMode = 'primary' | 'push' | 'feature' | 'replace'

type TransitionState = {
  direction: number
  mode: TransitionMode
}

type RouteInfo = {
  layer: RouteLayer
  parentPathname: string | null
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

function normalizePathname(pathname: string) {
  const normalized = pathname.replace(/\/+$/, '')
  return normalized || '/'
}

function getRouteInfo(pathname: string): RouteInfo {
  const normalizedPathname = normalizePathname(pathname)

  if (getPrimaryTabIndex(normalizedPathname) !== -1) {
    return { layer: 'primary', parentPathname: null }
  }

  if (/^\/exercise\/[^/]+$/.test(normalizedPathname)) {
    return { layer: 'detail', parentPathname: '/' }
  }

  if (/^\/summary\/[^/]+$/.test(normalizedPathname)) {
    return { layer: 'detail', parentPathname: '/summary' }
  }

  if (normalizedPathname === '/calendar') {
    return { layer: 'feature', parentPathname: null }
  }

  if (normalizedPathname === '/templates/cycle') {
    return { layer: 'feature', parentPathname: '/templates' }
  }

  return { layer: 'other', parentPathname: null }
}

function getTransitionState(previousPathname: string, pathname: string): TransitionState {
  const normalizedPreviousPathname = normalizePathname(previousPathname)
  const normalizedPathname = normalizePathname(pathname)
  const previousTabIndex = getPrimaryTabIndex(normalizedPreviousPathname)
  const nextTabIndex = getPrimaryTabIndex(normalizedPathname)
  const previousRoute = getRouteInfo(normalizedPreviousPathname)
  const nextRoute = getRouteInfo(normalizedPathname)

  if (previousTabIndex !== -1 && nextTabIndex !== -1) {
    if (previousTabIndex === nextTabIndex) {
      return { direction: 0, mode: 'primary' }
    }

    return {
      direction: nextTabIndex > previousTabIndex ? 1 : -1,
      mode: 'primary',
    }
  }

  if (nextRoute.layer === 'detail' && previousRoute.layer === 'primary') {
    return { direction: 1, mode: 'push' }
  }

  if (
    previousRoute.layer === 'detail' &&
    nextRoute.layer === 'primary' &&
    previousRoute.parentPathname === normalizedPathname
  ) {
    return { direction: -1, mode: 'push' }
  }

  if (nextRoute.layer === 'feature' && previousRoute.layer === 'primary') {
    return { direction: 1, mode: 'feature' }
  }

  if (
    previousRoute.layer === 'feature' &&
    nextRoute.layer === 'primary' &&
    (previousRoute.parentPathname === null || previousRoute.parentPathname === normalizedPathname)
  ) {
    return { direction: -1, mode: 'feature' }
  }

  if (
    previousRoute.layer === nextRoute.layer &&
    (previousRoute.layer === 'detail' || previousRoute.layer === 'feature')
  ) {
    return { direction: 0, mode: 'replace' }
  }

  if (previousRoute.layer === 'primary' && nextRoute.layer !== 'primary') {
    return { direction: 1, mode: nextRoute.layer === 'feature' ? 'feature' : 'push' }
  }

  return {
    direction: previousRoute.layer !== 'primary' && nextRoute.layer === 'primary' ? -1 : 0,
    mode: 'replace',
  }
}

function getTransitionKey(pathname: string) {
  return getPrimaryTabIndex(normalizePathname(pathname)) === -1 ? pathname : 'primary-tabs'
}

function isPrimaryPath(pathname: string) {
  return getPrimaryTabIndex(normalizePathname(pathname)) !== -1
}

function getInitialState(transitionState: TransitionState, reduceMotion: boolean) {
  if (reduceMotion) {
    return { opacity: 0 }
  }

  if (transitionState.mode === 'replace' || transitionState.direction === 0) {
    return { opacity: 0, y: 10 }
  }

  if (transitionState.mode === 'feature') {
    return {
      opacity: 0.98,
      x: transitionState.direction > 0 ? 18 : -14,
    }
  }

  return {
    opacity: 0.98,
    x: transitionState.direction > 0 ? 28 : -22,
  }
}

function getAnimateState(transitionState: TransitionState, reduceMotion: boolean) {
  return {
    opacity: 1,
    x: 0,
    y: 0,
    transition:
      reduceMotion ||
      transitionState.mode === 'primary' ||
      transitionState.mode === 'replace' ||
      transitionState.mode === 'feature'
        ? quickEaseTransition
        : pageSpringTransition,
  }
}

function getExitState(transitionState: TransitionState, reduceMotion: boolean) {
  if (reduceMotion) {
    return { opacity: 0, transition: quickEaseTransition }
  }

  if (transitionState.mode === 'replace' || transitionState.direction === 0) {
    return {
      opacity: 0,
      y: -6,
      transition: quickEaseTransition,
    }
  }

  if (transitionState.mode === 'feature') {
    return {
      opacity: 0.98,
      x: transitionState.direction > 0 ? -12 : 14,
      transition: quickEaseTransition,
    }
  }

  return {
    opacity: 0.98,
    x: transitionState.direction > 0 ? -18 : 22,
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
  const transitionKey = getTransitionKey(location.pathname)
  const content = isPrimaryPath(location.pathname) ? <PrimaryTabPanels /> : outlet

  useEffect(() => {
    previousPathnameRef.current = location.pathname
  }, [location.pathname])

  return (
    <div className="scrollbar-hide relative h-full overflow-hidden bg-[var(--surface)]">
      <AnimatePresence initial={false}>
        <motion.div
          key={transitionKey}
          initial={getInitialState(transitionState, shouldReduceMotion)}
          animate={getAnimateState(transitionState, shouldReduceMotion)}
          exit={getExitState(transitionState, shouldReduceMotion)}
          className="scrollbar-hide absolute inset-0 h-full w-full overflow-x-hidden overflow-y-auto bg-[var(--surface)] will-change-transform"
          style={{ zIndex: transitionState.direction > 0 ? 2 : 1 }}
        >
          {content}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
