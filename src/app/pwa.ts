import { registerSW } from 'virtual:pwa-register'

export const updateServiceWorker = registerSW({
  immediate: true,
})
