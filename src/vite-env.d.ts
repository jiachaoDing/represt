/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_VERSION__: string

interface ImportMetaEnv {
  readonly VITE_PLAN_SHARE_API_BASE_URL?: string
  readonly VITE_PLAN_SHARE_WEB_BASE_URL?: string
}
