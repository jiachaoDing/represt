const plansChangedEventName = 'trainre:plans-changed'

type PlansChangedEventDetail = {
  preferredPlanId?: string | null
}

export function notifyPlansChanged(preferredPlanId?: string | null) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<PlansChangedEventDetail>(plansChangedEventName, {
      detail: { preferredPlanId },
    }),
  )
}

export function subscribeToPlansChanged(
  listener: (preferredPlanId?: string | null) => void,
) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  function handlePlansChanged(event: Event) {
    listener((event as CustomEvent<PlansChangedEventDetail>).detail?.preferredPlanId)
  }

  window.addEventListener(plansChangedEventName, handlePlansChanged)

  return () => {
    window.removeEventListener(plansChangedEventName, handlePlansChanged)
  }
}
