package com.trainre.app;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "RestTimerAlarm")
public class RestTimerAlarmPlugin extends Plugin {
    @PluginMethod
    public void status(PluginCall call) {
        Context context = getContext();
        ensureAlarmChannel(context);

        JSObject result = new JSObject();
        result.put("available", true);
        result.put("channelId", RestTimerAlarmConstants.CHANNEL_ID);
        result.put("canScheduleExactAlarms", canScheduleExactAlarms(context));
        result.put("canUseFullScreenIntent", canUseFullScreenIntent(context));
        addChannelStatus(context, result);
        call.resolve(result);
    }

    @PluginMethod
    public void schedule(PluginCall call) {
        Integer id = call.getInt("id");
        Long triggerAt = call.getLong("triggerAt");
        if (id == null || id == 0 || triggerAt == null || triggerAt <= System.currentTimeMillis()) {
            call.reject("Invalid rest timer alarm.");
            return;
        }

        Context context = getContext();
        ensureAlarmChannel(context);
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            call.reject("AlarmManager unavailable.");
            return;
        }
        if (!canScheduleExactAlarms(context)) {
            JSObject result = new JSObject();
            result.put("scheduled", false);
            result.put("canScheduleExactAlarms", false);
            call.resolve(result);
            return;
        }

        PendingIntent alarmIntent = buildAlarmIntent(context, id, call, PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent showIntent = buildLaunchIntent(context, id, call.getString("path"));
        try {
            alarmManager.setAlarmClock(new AlarmManager.AlarmClockInfo(triggerAt, showIntent), alarmIntent);
        } catch (SecurityException alarmPermissionError) {
            JSObject result = new JSObject();
            result.put("scheduled", false);
            result.put("canScheduleExactAlarms", false);
            call.resolve(result);
            return;
        }

        JSObject result = new JSObject();
        result.put("scheduled", true);
        call.resolve(result);
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Integer id = call.getInt("id");
        if (id == null || id == 0) {
            call.resolve();
            return;
        }

        Context context = getContext();
        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            PendingIntent alarmIntent = buildAlarmIntent(context, id, call, PendingIntent.FLAG_NO_CREATE);
            if (alarmIntent != null) {
                alarmManager.cancel(alarmIntent);
                alarmIntent.cancel();
            }
        }

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.cancel(id);
        }

        call.resolve();
    }

    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        Context context = getContext();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            call.resolve();
            return;
        }

        Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM)
            .setData(Uri.parse("package:" + context.getPackageName()));
        try {
            getActivity().startActivity(intent);
        } catch (Exception settingsError) {
            call.reject("Exact alarm settings unavailable.");
            return;
        }
        call.resolve();
    }

    @PluginMethod
    public void openChannelSettings(PluginCall call) {
        Context context = getContext();
        ensureAlarmChannel(context);

        Intent intent;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            intent = new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, context.getPackageName())
                .putExtra(Settings.EXTRA_CHANNEL_ID, RestTimerAlarmConstants.CHANNEL_ID);
        } else {
            intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
                .setData(Uri.parse("package:" + context.getPackageName()));
        }

        try {
            getActivity().startActivity(intent);
        } catch (Exception settingsError) {
            call.reject("Notification channel settings unavailable.");
            return;
        }

        call.resolve();
    }

    public static void ensureAlarmChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        manager.deleteNotificationChannel(RestTimerAlarmConstants.OLD_CHANNEL_ID);

        NotificationChannel channel = new NotificationChannel(
            RestTimerAlarmConstants.CHANNEL_ID,
            context.getString(R.string.rest_timer_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(context.getString(R.string.rest_timer_channel_description));
        channel.setLockscreenVisibility(android.app.Notification.VISIBILITY_PUBLIC);
        channel.enableVibration(true);
        channel.setVibrationPattern(new long[] { 0, 350, 120, 350 });

        Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (sound == null) {
            sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
        }
        if (sound != null) {
            AudioAttributes attributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();
            channel.setSound(sound, attributes);
        }

        manager.createNotificationChannel(channel);
    }

    private void addChannelStatus(Context context, JSObject result) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            result.put("channelReady", true);
            result.put("channelImportance", null);
            result.put("channelVibration", null);
            result.put("channelSound", null);
            return;
        }

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        NotificationChannel channel = manager != null ? manager.getNotificationChannel(RestTimerAlarmConstants.CHANNEL_ID) : null;
        result.put("channelReady", channel != null);
        result.put("channelImportance", channel != null ? channel.getImportance() : null);
        result.put("channelVibration", channel != null ? channel.shouldVibrate() : null);
        result.put("channelSound", channel != null && channel.getSound() != null ? channel.getSound().toString() : null);
    }

    private boolean canScheduleExactAlarms(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) {
            return true;
        }

        AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
        return alarmManager != null && alarmManager.canScheduleExactAlarms();
    }

    private boolean canUseFullScreenIntent(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            return true;
        }

        NotificationManager manager = context.getSystemService(NotificationManager.class);
        return manager != null && manager.canUseFullScreenIntent();
    }

    private PendingIntent buildAlarmIntent(Context context, int id, PluginCall call, int intentFlag) {
        Intent intent = new Intent(context, RestTimerAlarmReceiver.class)
            .setAction(RestTimerAlarmConstants.ACTION_ALARM)
            .putExtra(RestTimerAlarmConstants.EXTRA_ID, id)
            .putExtra(RestTimerAlarmConstants.EXTRA_TITLE, call.getString("title", context.getString(R.string.rest_timer_default_title)))
            .putExtra(RestTimerAlarmConstants.EXTRA_BODY, call.getString("body", context.getString(R.string.rest_timer_default_body)))
            .putExtra(RestTimerAlarmConstants.EXTRA_PATH, call.getString("path"));

        return PendingIntent.getBroadcast(context, id, intent, intentFlag | pendingIntentFlags());
    }

    private PendingIntent buildLaunchIntent(Context context, int id, String path) {
        Intent launchIntent = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .putExtra(RestTimerAlarmConstants.EXTRA_PATH, path);

        return PendingIntent.getActivity(context, id, launchIntent, pendingIntentFlags());
    }

    private int pendingIntentFlags() {
        return PendingIntent.FLAG_IMMUTABLE;
    }
}
