package com.represt.app;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.ConsumeParams;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "SupportBilling")
public class SupportBillingPlugin extends Plugin implements PurchasesUpdatedListener {
    private static final String SUPPORT_PRODUCT_ID = "support_developer";

    private BillingClient billingClient;
    private boolean isConnecting = false;
    private final List<BillingReadyCallback> readyCallbacks = new ArrayList<>();
    private PluginCall pendingPurchaseCall;

    @Override
    public void load() {
        super.load();
        billingClient = BillingClient.newBuilder(getContext())
            .setListener(this)
            .enableAutoServiceReconnection()
            .enablePendingPurchases(
                PendingPurchasesParams.newBuilder()
                    .enableOneTimeProducts()
                    .build()
            )
            .build();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        ensureBillingReady((isReady, reason) -> {
            JSObject result = new JSObject();
            result.put("available", isReady);
            if (!isReady) {
                result.put("reason", reason);
            }
            call.resolve(result);
        });
    }

    @PluginMethod
    public void getSupportProduct(PluginCall call) {
        ensureBillingReady((isReady, reason) -> {
            if (!isReady) {
                call.resolve(unavailableProduct(reason));
                return;
            }

            querySupportProductDetails((productDetails, queryReason) -> {
                if (productDetails == null) {
                    call.resolve(unavailableProduct(queryReason));
                    return;
                }

                JSObject result = new JSObject();
                result.put("available", true);
                result.put("productId", productDetails.getProductId());
                result.put("title", productDetails.getTitle());
                result.put("description", productDetails.getDescription());
                result.put("formattedPrice", getFormattedPrice(productDetails));
                call.resolve(result);
            });
        });
    }

    @PluginMethod
    public void purchaseSupport(PluginCall call) {
        if (pendingPurchaseCall != null) {
            call.resolve(purchaseResult("pending", "purchaseInProgress"));
            return;
        }

        ensureBillingReady((isReady, reason) -> {
            if (!isReady) {
                call.resolve(purchaseResult("unavailable", reason));
                return;
            }

            querySupportProductDetails((productDetails, queryReason) -> {
                if (productDetails == null) {
                    call.resolve(purchaseResult("unavailable", queryReason));
                    return;
                }

                BillingFlowParams.ProductDetailsParams productDetailsParams =
                    BillingFlowParams.ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .build();
                BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
                    .setProductDetailsParamsList(Collections.singletonList(productDetailsParams))
                    .build();
                BillingResult billingResult = billingClient.launchBillingFlow(getActivity(), billingFlowParams);
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                    call.resolve(purchaseResult("unavailable", responseCodeReason(billingResult)));
                    return;
                }

                pendingPurchaseCall = call;
            });
        });
    }

    @PluginMethod
    public void syncPendingPurchases(PluginCall call) {
        ensureBillingReady((isReady, reason) -> {
            if (!isReady) {
                call.resolve(syncResult(0, false));
                return;
            }

            QueryPurchasesParams params = QueryPurchasesParams.newBuilder()
                .setProductType(BillingClient.ProductType.INAPP)
                .build();
            billingClient.queryPurchasesAsync(params, (billingResult, purchases) -> {
                if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK || purchases == null) {
                    call.resolve(syncResult(0, false));
                    return;
                }

                SyncCounter counter = new SyncCounter(purchases.size(), call);
                for (Purchase purchase : purchases) {
                    if (!isSupportPurchase(purchase)) {
                        counter.finishOne(false, false);
                        continue;
                    }

                    int purchaseState = purchase.getPurchaseState();
                    if (purchaseState == Purchase.PurchaseState.PENDING) {
                        counter.finishOne(false, true);
                    } else if (purchaseState == Purchase.PurchaseState.PURCHASED) {
                        consumeSupportPurchase(purchase, (success) -> counter.finishOne(success, false));
                    } else {
                        counter.finishOne(false, false);
                    }
                }
            });
        });
    }

    @Override
    public void onPurchasesUpdated(BillingResult billingResult, List<Purchase> purchases) {
        PluginCall call = pendingPurchaseCall;
        pendingPurchaseCall = null;
        if (call == null) {
            return;
        }

        int responseCode = billingResult.getResponseCode();
        if (responseCode == BillingClient.BillingResponseCode.USER_CANCELED) {
            call.resolve(purchaseResult("cancelled", "userCancelled"));
            return;
        }
        if (responseCode != BillingClient.BillingResponseCode.OK || purchases == null) {
            call.resolve(purchaseResult("error", responseCodeReason(billingResult)));
            return;
        }

        Purchase supportPurchase = findSupportPurchase(purchases);
        if (supportPurchase == null) {
            call.resolve(purchaseResult("error", "missingPurchase"));
            return;
        }

        if (supportPurchase.getPurchaseState() == Purchase.PurchaseState.PENDING) {
            call.resolve(purchaseResult("pending", "pending"));
            return;
        }
        if (supportPurchase.getPurchaseState() != Purchase.PurchaseState.PURCHASED) {
            call.resolve(purchaseResult("error", "notPurchased"));
            return;
        }

        consumeSupportPurchase(supportPurchase, (success) -> {
            call.resolve(success ? purchaseResult("purchased", null) : purchaseResult("error", "consumeFailed"));
        });
    }

    private void ensureBillingReady(BillingReadyCallback callback) {
        if (billingClient == null) {
            callback.onReady(false, "unavailable");
            return;
        }
        if (billingClient.isReady()) {
            callback.onReady(true, null);
            return;
        }

        readyCallbacks.add(callback);
        if (isConnecting) {
            return;
        }

        isConnecting = true;
        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                isConnecting = false;
                boolean isReady = billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK;
                flushReadyCallbacks(isReady, isReady ? null : responseCodeReason(billingResult));
            }

            @Override
            public void onBillingServiceDisconnected() {
                isConnecting = false;
            }
        });
    }

    private void querySupportProductDetails(ProductDetailsCallback callback) {
        QueryProductDetailsParams.Product product = QueryProductDetailsParams.Product.newBuilder()
            .setProductId(SUPPORT_PRODUCT_ID)
            .setProductType(BillingClient.ProductType.INAPP)
            .build();
        QueryProductDetailsParams params = QueryProductDetailsParams.newBuilder()
            .setProductList(Collections.singletonList(product))
            .build();

        billingClient.queryProductDetailsAsync(params, (billingResult, productDetailsResult) -> {
            if (billingResult.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                callback.onProductDetails(null, responseCodeReason(billingResult));
                return;
            }

            List<ProductDetails> productDetailsList = productDetailsResult.getProductDetailsList();
            if (productDetailsList == null || productDetailsList.isEmpty()) {
                callback.onProductDetails(null, "notFound");
                return;
            }

            callback.onProductDetails(productDetailsList.get(0), null);
        });
    }

    private void consumeSupportPurchase(Purchase purchase, ConsumeCallback callback) {
        ConsumeParams consumeParams = ConsumeParams.newBuilder()
            .setPurchaseToken(purchase.getPurchaseToken())
            .build();
        billingClient.consumeAsync(consumeParams, (billingResult, purchaseToken) -> {
            callback.onConsumed(billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK);
        });
    }

    private void flushReadyCallbacks(boolean isReady, String reason) {
        List<BillingReadyCallback> callbacks = new ArrayList<>(readyCallbacks);
        readyCallbacks.clear();
        for (BillingReadyCallback callback : callbacks) {
            callback.onReady(isReady, reason);
        }
    }

    private Purchase findSupportPurchase(List<Purchase> purchases) {
        for (Purchase purchase : purchases) {
            if (isSupportPurchase(purchase)) {
                return purchase;
            }
        }
        return null;
    }

    private boolean isSupportPurchase(Purchase purchase) {
        return purchase != null && purchase.getProducts().contains(SUPPORT_PRODUCT_ID);
    }

    private String getFormattedPrice(ProductDetails productDetails) {
        ProductDetails.OneTimePurchaseOfferDetails offerDetails = productDetails.getOneTimePurchaseOfferDetails();
        return offerDetails == null ? null : offerDetails.getFormattedPrice();
    }

    private JSObject unavailableProduct(String reason) {
        JSObject result = new JSObject();
        result.put("available", false);
        result.put("reason", reason == null ? "unavailable" : reason);
        return result;
    }

    private JSObject purchaseResult(String status, String reason) {
        JSObject result = new JSObject();
        result.put("status", status);
        if (reason != null) {
            result.put("reason", reason);
        }
        return result;
    }

    private JSObject syncResult(int consumedCount, boolean hasPending) {
        JSObject result = new JSObject();
        result.put("consumedCount", consumedCount);
        result.put("hasPending", hasPending);
        return result;
    }

    private String responseCodeReason(BillingResult billingResult) {
        return "billingCode:" + billingResult.getResponseCode();
    }

    private interface BillingReadyCallback {
        void onReady(boolean isReady, String reason);
    }

    private interface ProductDetailsCallback {
        void onProductDetails(ProductDetails productDetails, String reason);
    }

    private interface ConsumeCallback {
        void onConsumed(boolean success);
    }

    private class SyncCounter {
        private int remaining;
        private int consumedCount = 0;
        private boolean hasPending = false;
        private final PluginCall call;

        SyncCounter(int total, PluginCall call) {
            this.remaining = total;
            this.call = call;
            if (total == 0) {
                call.resolve(syncResult(0, false));
            }
        }

        void finishOne(boolean consumed, boolean pending) {
            if (consumed) {
                consumedCount += 1;
            }
            if (pending) {
                hasPending = true;
            }

            remaining -= 1;
            if (remaining <= 0) {
                call.resolve(syncResult(consumedCount, hasPending));
            }
        }
    }
}
