package com.represt.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TrainingTimerNotification")
public class TrainingTimerNotificationPlugin extends Plugin {
    private String pendingLaunchPath;
    private String pendingTimerType;
    private String pendingLaunchAction;
    private String pendingExerciseId;

    @Override
    public void load() {
        super.load();
        TrainingTimerForegroundService.ensureTimerChannel(getContext());
        readLaunchIntent(getActivity().getIntent());
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        if (!readLaunchIntent(intent)) {
            return;
        }

        JSObject event = new JSObject();
        event.put("path", pendingLaunchPath);
        event.put("timerType", pendingTimerType);
        event.put("launchAction", pendingLaunchAction);
        event.put("exerciseId", pendingExerciseId);
        notifyListeners(TrainingTimerNotificationConstants.EVENT_NOTIFICATION_TAPPED, event, true);
    }

    @PluginMethod
    public void status(PluginCall call) {
        Context context = getContext();
        TrainingTimerForegroundService.ensureTimerChannel(context);

        JSObject result = new JSObject();
        result.put("available", true);
        result.put("channelId", TrainingTimerNotificationConstants.CHANNEL_ID);
        result.put("isIgnoringBatteryOptimizations", isIgnoringBatteryOptimizations(context));
        addChannelStatus(context, result);
        call.resolve(result);
    }

    @PluginMethod
    public void startTimerNotification(PluginCall call) {
        Integer id = call.getInt("id");
        Long endsAt = call.getLong("endsAt");
        if (id == null || id == 0 || endsAt == null || endsAt <= System.currentTimeMillis()) {
            call.reject("Invalid timer notification.");
            return;
        }

        Intent intent = new Intent(getContext(), TrainingTimerForegroundService.class)
            .setAction(TrainingTimerNotificationConstants.ACTION_START)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_ID, id)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE, call.getString("timerType"))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_TITLE, call.getString("title"))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_BODY, call.getString("body"))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_FINISHED_TITLE, call.getString("finishedTitle"))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_FINISHED_BODY, call.getString("finishedBody"))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_ENDS_AT, endsAt)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_PATH, call.getString("path"))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_PLAY_FINAL_BEEPS, call.getBoolean("playFinalBeeps", false))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_BEEP_VOLUME, clampBeepVolume(call.getDouble("beepVolume", 0.2)))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_IS_PAUSED, call.getBoolean("isPaused", false))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_REMAINING_MS, call.getLong("remainingMs", 0L))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_TOTAL_SECONDS, call.getInt("totalSeconds", 0));

        try {
            ContextCompat.startForegroundService(getContext(), intent);
        } catch (Exception serviceError) {
            call.reject("Timer foreground service unavailable.");
            return;
        }

        JSObject result = new JSObject();
        result.put("started", true);
        call.resolve(result);
    }

    @PluginMethod
    public void cancelTimerNotification(PluginCall call) {
        Integer id = call.getInt("id");
        if (id == null || id == 0) {
            call.resolve();
            return;
        }

        Intent intent = new Intent(getContext(), TrainingTimerForegroundService.class)
            .setAction(TrainingTimerNotificationConstants.ACTION_CANCEL)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_ID, id);
        try {
            getContext().startService(intent);
        } catch (Exception serviceError) {
            NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
            if (manager != null) {
                manager.cancel(id);
            }
        }

        call.resolve();
    }

    @PluginMethod
    public void isIgnoringBatteryOptimizations(PluginCall call) {
        JSObject result = new JSObject();
        result.put("isIgnoringBatteryOptimizations", isIgnoringBatteryOptimizations(getContext()));
        call.resolve(result);
    }

    @PluginMethod
    public void openBatteryOptimizationSettings(PluginCall call) {
        openBatteryOptimizationSettingsFallback(call);
    }

    private void openBatteryOptimizationSettingsFallback(PluginCall call) {
        Context context = getContext();
        Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception settingsError) {
            try {
                Intent fallbackIntent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                    .setData(Uri.parse("package:" + context.getPackageName()));
                getActivity().startActivity(fallbackIntent);
                call.resolve();
            } catch (Exception fallbackError) {
                call.reject("Battery optimization settings unavailable.");
            }
        }
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        Context context = getContext();
        if (isIgnoringBatteryOptimizations(context)) {
            call.resolve();
            return;
        }

        Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
            .setData(Uri.parse("package:" + context.getPackageName()));
        try {
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception settingsError) {
            openBatteryOptimizationSettingsFallback(call);
        }
    }

    @PluginMethod
    public void consumeLaunchPath(PluginCall call) {
        JSObject result = new JSObject();
        result.put("path", pendingLaunchPath);
        result.put("timerType", pendingTimerType);
        result.put("launchAction", pendingLaunchAction);
        result.put("exerciseId", pendingExerciseId);
        pendingLaunchPath = null;
        pendingTimerType = null;
        pendingLaunchAction = null;
        pendingExerciseId = null;
        call.resolve(result);
    }

    private boolean readLaunchIntent(Intent intent) {
        if (intent == null || !Intent.ACTION_MAIN.equals(intent.getAction())) {
            return false;
        }

        String path = intent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_PATH);
        if (path == null || path.isEmpty()) {
            return false;
        }

        pendingLaunchPath = path;
        pendingTimerType = intent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE);
        pendingLaunchAction = intent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_LAUNCH_ACTION);
        pendingExerciseId = intent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_EXERCISE_ID);
        return true;
    }

    private boolean isIgnoringBatteryOptimizations(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }

        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        return powerManager != null && powerManager.isIgnoringBatteryOptimizations(context.getPackageName());
    }

    private double clampBeepVolume(double volume) {
        if (Double.isNaN(volume)) {
            return 0.2;
        }

        return Math.max(0.0, Math.min(1.0, volume));
    }

    private void addChannelStatus(Context context, JSObject result) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            result.put("channelReady", true);
            result.put("channelImportance", null);
            return;
        }

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = manager != null ? manager.getNotificationChannel(TrainingTimerNotificationConstants.CHANNEL_ID) : null;
        result.put("channelReady", channel != null);
        result.put("channelImportance", channel != null ? channel.getImportance() : null);
    }
}
