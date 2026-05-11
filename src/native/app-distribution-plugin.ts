import { registerPlugin } from '@capacitor/core'

export type AppDistributionChannel = 'play' | 'apk'

export type AppDistributionInfo = {
  channel: AppDistributionChannel
  installerPackageName: string | null
}

export type AppDistributionPlugin = {
  getInstallSource: () => Promise<AppDistributionInfo>
}

export const AppDistribution = registerPlugin<AppDistributionPlugin>('AppDistribution')

