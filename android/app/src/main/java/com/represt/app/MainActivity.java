package com.represt.app;

import android.os.Bundle;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static int visibleActivityCount = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TrainingTimerNotificationPlugin.class);
        super.onCreate(savedInstanceState);
        configureWebViewZoom();
    }

    private void configureWebViewZoom() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }

        WebSettings settings = getBridge().getWebView().getSettings();
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
    }

    @Override
    public void onStart() {
        super.onStart();
        visibleActivityCount += 1;
        TrainingTimerForegroundService.stopFinishAlertFromAppForeground();
    }

    @Override
    public void onStop() {
        visibleActivityCount = Math.max(0, visibleActivityCount - 1);
        super.onStop();
    }

    static boolean isAppVisible() {
        return visibleActivityCount > 0;
    }
}
