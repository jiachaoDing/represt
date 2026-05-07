package com.represt.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

public class TrainingTimerAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) {
            return;
        }

        TrainingTimerForegroundService.notifyAlarmDiagnostic(context, intent, "receiver received");

        Intent serviceIntent = new Intent(context, TrainingTimerForegroundService.class)
            .setAction(TrainingTimerNotificationConstants.ACTION_FINISH_FROM_ALARM)
            .putExtras(intent);

        try {
            ContextCompat.startForegroundService(context, serviceIntent);
        } catch (RuntimeException serviceError) {
            TrainingTimerForegroundService.notifyAlarmDiagnostic(context, intent, "service start failed");
        }
    }
}
