package com.represt.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static int visibleActivityCount = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(TrainingTimerNotificationPlugin.class);
        super.onCreate(savedInstanceState);
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
