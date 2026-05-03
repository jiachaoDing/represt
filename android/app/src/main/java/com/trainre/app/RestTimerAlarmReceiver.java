package com.trainre.app;

import android.Manifest;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

public class RestTimerAlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        int id = intent.getIntExtra(RestTimerAlarmConstants.EXTRA_ID, 0);
        if (id == 0 || !canPostNotifications(context)) {
            return;
        }

        RestTimerAlarmPlugin.ensureAlarmChannel(context);

        String title = intent.getStringExtra(RestTimerAlarmConstants.EXTRA_TITLE);
        String body = intent.getStringExtra(RestTimerAlarmConstants.EXTRA_BODY);
        String path = intent.getStringExtra(RestTimerAlarmConstants.EXTRA_PATH);
        PendingIntent contentIntent = buildLaunchIntent(context, id, path);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, RestTimerAlarmConstants.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_trainre_notification)
            .setContentTitle(title != null ? title : context.getString(R.string.rest_timer_default_title))
            .setContentText(body != null ? body : context.getString(R.string.rest_timer_default_body))
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body != null ? body : context.getString(R.string.rest_timer_default_body)))
            .setContentIntent(contentIntent)
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setGroup(RestTimerAlarmConstants.GROUP);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            builder.setSound(sound).setVibrate(new long[] { 0, 350, 120, 350 });
        }

        NotificationManagerCompat.from(context).notify(id, builder.build());
    }

    private boolean canPostNotifications(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return true;
        }

        return ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private PendingIntent buildLaunchIntent(Context context, int id, String path) {
        Intent launchIntent = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .putExtra(RestTimerAlarmConstants.EXTRA_PATH, path);

        return PendingIntent.getActivity(context, id, launchIntent, pendingIntentFlags());
    }

    private int pendingIntentFlags() {
        return PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
    }
}
