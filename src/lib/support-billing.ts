import { isNativePluginAvailable } from '../native/capacitor-platform'
import {
  SupportBilling,
  type SupportBillingProduct,
  type SupportPurchaseResult,
} from '../native/support-billing-plugin'

export async function getSupportBillingProduct(): Promise<SupportBillingProduct> {
  if (!isNativePluginAvailable('SupportBilling')) {
    return { available: false, reason: 'unavailable' }
  }

  try {
    return await SupportBilling.getSupportProduct()
  } catch (productError) {
    console.warn(productError)
    return { available: false, reason: 'error' }
  }
}

export async function purchaseDeveloperSupport(): Promise<SupportPurchaseResult> {
  if (!isNativePluginAvailable('SupportBilling')) {
    return { status: 'unavailable', reason: 'unavailable' }
  }

  try {
    return await SupportBilling.purchaseSupport()
  } catch (purchaseError) {
    console.warn(purchaseError)
    return { status: 'error', reason: 'error' }
  }
}

export async function syncSupportPurchases() {
  if (!isNativePluginAvailable('SupportBilling')) {
    return { consumedCount: 0, hasPending: false }
  }

  try {
    return await SupportBilling.syncPendingPurchases()
  } catch (syncError) {
    console.warn(syncError)
    return { consumedCount: 0, hasPending: false }
  }
}
