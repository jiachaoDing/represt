import { registerPlugin } from '@capacitor/core'

export type SupportBillingProduct = {
  available: boolean
  productId?: string
  title?: string
  description?: string
  formattedPrice?: string
  reason?: string
}

export type SupportPurchaseStatus = 'purchased' | 'pending' | 'cancelled' | 'unavailable' | 'error'

export type SupportPurchaseResult = {
  status: SupportPurchaseStatus
  reason?: string
}

export type SupportBillingPlugin = {
  isAvailable: () => Promise<{ available: boolean; reason?: string }>
  getSupportProduct: () => Promise<SupportBillingProduct>
  purchaseSupport: () => Promise<SupportPurchaseResult>
  syncPendingPurchases: () => Promise<{ consumedCount: number; hasPending: boolean }>
}

export const SupportBilling = registerPlugin<SupportBillingPlugin>('SupportBilling')
