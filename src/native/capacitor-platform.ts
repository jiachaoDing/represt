import { Capacitor } from '@capacitor/core'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export function isNativePluginAvailable(pluginName: string) {
  return isNativeApp() && Capacitor.isPluginAvailable(pluginName)
}
