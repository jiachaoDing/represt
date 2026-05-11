import { isNativeApp, isNativePluginAvailable } from './capacitor-platform'
import { AppDistribution, type AppDistributionChannel } from './app-distribution-plugin'

export async function getAppDistributionChannel(): Promise<AppDistributionChannel> {
  if (!isNativeApp() || !isNativePluginAvailable('AppDistribution')) {
    return 'apk'
  }

  try {
    const info = await AppDistribution.getInstallSource()
    return info.channel === 'play' ? 'play' : 'apk'
  } catch {
    return 'apk'
  }
}

