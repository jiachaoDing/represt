package com.trainre.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.HashMap;
import java.util.Map;

public class TrainingTimerForegroundService extends Service {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, TimerRecord> timers = new HashMap<>();
    private ToneGenerator toneGenerator;
    private Runnable stopRunnable;
    private int primaryId;

    private static final class TimerRecord {
        final int id;
        final Intent intent;
        final long endsAt;
        final boolean playFinalBeeps;
        Runnable finishRunnable;
        Runnable beepRunnable;

        TimerRecord(int id, Intent intent, long endsAt, boolean playFinalBeeps) {
            this.id = id;
            this.intent = intent;
            this.endsAt = endsAt;
            this.playFinalBeeps = playFinalBeeps;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        ensureTimerChannel(this);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent == null) {
            stopSelf(startId);
            return START_NOT_STICKY;
        }

        String action = intent.getAction();
        if (TrainingTimerNotificationConstants.ACTION_CANCEL.equals(action)) {
            cancelTimer(intent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0));
            return START_NOT_STICKY;
        }

        if (TrainingTimerNotificationConstants.ACTION_START.equals(action)) {
            startTimer(intent, startId);
            return START_NOT_STICKY;
        }

        stopSelf(startId);
        return START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        clearAllTimers();
        releaseToneGenerator();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    public static void ensureTimerChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        NotificationChannel channel = new NotificationChannel(
            TrainingTimerNotificationConstants.CHANNEL_ID,
            context.getString(R.string.training_timer_channel_name),
            NotificationManager.IMPORTANCE_LOW
        );
        channel.setDescription(context.getString(R.string.training_timer_channel_description));
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.setSound(null, null);
        channel.enableVibration(false);
        manager.createNotificationChannel(channel);
    }

    private void startTimer(Intent intent, int startId) {
        int id = intent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        long endsAt = intent.getLongExtra(TrainingTimerNotificationConstants.EXTRA_ENDS_AT, 0L);
        if (id == 0 || endsAt <= System.currentTimeMillis() || !canPostNotifications()) {
            stopSelf(startId);
            return;
        }

        clearTimer(id);
        releaseStopCallback();
        TimerRecord record = new TimerRecord(
            id,
            new Intent(intent),
            endsAt,
            intent.getBooleanExtra(TrainingTimerNotificationConstants.EXTRA_PLAY_FINAL_BEEPS, false)
        );
        timers.put(id, record);

        Notification notification = buildRunningNotification(intent, endsAt);
        try {
            if (primaryId == 0 || primaryId == id) {
                startForeground(id, notification);
                primaryId = id;
            } else {
                NotificationManagerCompat.from(this).notify(id, notification);
            }
        } catch (SecurityException notificationError) {
            timers.remove(id);
            stopSelf(startId);
            return;
        }

        scheduleFinalBeeps(record);
        record.finishRunnable = () -> finishTimer(id);
        handler.postDelayed(record.finishRunnable, Math.max(0L, endsAt - System.currentTimeMillis()));
    }

    private Notification buildRunningNotification(Intent intent, long endsAt) {
        String title = getStringExtra(intent, TrainingTimerNotificationConstants.EXTRA_TITLE, getString(R.string.training_timer_default_title));
        String body = getStringExtra(intent, TrainingTimerNotificationConstants.EXTRA_BODY, getString(R.string.training_timer_default_body));

        return new NotificationCompat.Builder(this, TrainingTimerNotificationConstants.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_trainre_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(buildLaunchIntent(intent))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setGroup(TrainingTimerNotificationConstants.GROUP)
            .setWhen(endsAt)
            .setUsesChronometer(true)
            .setChronometerCountDown(true)
            .build();
    }

    private Notification buildFinishedNotification(Intent intent) {
        String title = getStringExtra(
            intent,
            TrainingTimerNotificationConstants.EXTRA_FINISHED_TITLE,
            getString(R.string.training_timer_finished_title)
        );
        String body = getStringExtra(
            intent,
            TrainingTimerNotificationConstants.EXTRA_FINISHED_BODY,
            getString(R.string.training_timer_finished_body)
        );

        return new NotificationCompat.Builder(this, TrainingTimerNotificationConstants.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_trainre_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(buildLaunchIntent(intent))
            .setAutoCancel(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setGroup(TrainingTimerNotificationConstants.GROUP)
            .setShowWhen(true)
            .build();
    }

    private PendingIntent buildLaunchIntent(Intent sourceIntent) {
        int id = sourceIntent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        Intent launchIntent = new Intent(this, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .putExtra(
                TrainingTimerNotificationConstants.EXTRA_PATH,
                sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_PATH)
            )
            .putExtra(
                TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE,
                sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE)
            );

        return PendingIntent.getActivity(this, id, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void scheduleFinalBeeps(TimerRecord record) {
        if (!record.playFinalBeeps) {
            return;
        }

        long firstBeepDelay = record.endsAt - System.currentTimeMillis() - 3000L;
        if (firstBeepDelay < 0L) {
            firstBeepDelay = 0L;
        }

        record.beepRunnable = new Runnable() {
            private int beepCount = 0;

            @Override
            public void run() {
                if (beepCount >= 3 || !timers.containsKey(record.id)) {
                    return;
                }

                playBeep();
                beepCount += 1;
                handler.postDelayed(this, 1000L);
            }
        };
        handler.postDelayed(record.beepRunnable, firstBeepDelay);
    }

    private void playBeep() {
        try {
            if (toneGenerator == null) {
                toneGenerator = new ToneGenerator(AudioManager.STREAM_MUSIC, 45);
            }
            toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, 120);
        } catch (RuntimeException toneError) {
            releaseToneGenerator();
        }
    }

    private void playFinishTone() {
        try {
            if (toneGenerator == null) {
                toneGenerator = new ToneGenerator(AudioManager.STREAM_MUSIC, 55);
            }
            toneGenerator.startTone(ToneGenerator.TONE_PROP_BEEP, 520);
        } catch (RuntimeException toneError) {
            releaseToneGenerator();
        }
    }

    private void finishTimer(int id) {
        TimerRecord record = timers.remove(id);
        if (record == null) {
            return;
        }

        clearTimerCallbacks(record);
        if (record.playFinalBeeps) {
            playFinishTone();
        } else {
            releaseToneGenerator();
        }
        if (id == primaryId) {
            promotePrimaryTimer();
        }
        if (canPostNotifications()) {
            NotificationManagerCompat.from(this).notify(id, buildFinishedNotification(record.intent));
        }
        stopRunnable = () -> {
            releaseToneGenerator();
            if (timers.isEmpty()) {
                stopSelf();
            }
        };
        handler.postDelayed(stopRunnable, record.playFinalBeeps ? 650L : 0L);
    }

    private void cancelTimer(int id) {
        if (id == 0) {
            clearAllTimers();
            NotificationManagerCompat.from(this).cancelAll();
            removeForegroundNotification();
            stopSelf();
            return;
        }

        boolean wasPrimary = id == primaryId;
        clearTimer(id);
        NotificationManagerCompat.from(this).cancel(id);
        if (wasPrimary) {
            if (timers.isEmpty()) {
                primaryId = 0;
                removeForegroundNotification();
            } else {
                promotePrimaryTimer();
            }
        }
        if (timers.isEmpty()) {
            releaseToneGenerator();
            stopSelf();
        }
    }

    private void detachForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(Service.STOP_FOREGROUND_DETACH);
            return;
        }

        stopForeground(false);
    }

    private void removeForegroundNotification() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(Service.STOP_FOREGROUND_REMOVE);
            return;
        }

        stopForeground(true);
    }

    private void promotePrimaryTimer() {
        if (timers.isEmpty()) {
            primaryId = 0;
            detachForegroundNotification();
            return;
        }

        TimerRecord nextRecord = timers.values().iterator().next();
        primaryId = nextRecord.id;
        startForeground(nextRecord.id, buildRunningNotification(nextRecord.intent, nextRecord.endsAt));
    }

    private void clearTimer(int id) {
        TimerRecord record = timers.remove(id);
        if (record == null) {
            return;
        }
        clearTimerCallbacks(record);
    }

    private void clearTimerCallbacks(TimerRecord record) {
        if (record.finishRunnable != null) {
            handler.removeCallbacks(record.finishRunnable);
            record.finishRunnable = null;
        }
        if (record.beepRunnable != null) {
            handler.removeCallbacks(record.beepRunnable);
            record.beepRunnable = null;
        }
    }

    private void clearAllTimers() {
        for (TimerRecord record : timers.values()) {
            clearTimerCallbacks(record);
        }
        timers.clear();
        primaryId = 0;
        releaseStopCallback();
    }

    private void releaseStopCallback() {
        if (stopRunnable != null) {
            handler.removeCallbacks(stopRunnable);
            stopRunnable = null;
        }
    }

    private void releaseToneGenerator() {
        if (toneGenerator != null) {
            toneGenerator.release();
            toneGenerator = null;
        }
    }

    private boolean canPostNotifications() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            return true;
        }

        return ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
    }

    private String getStringExtra(Intent intent, String name, String fallback) {
        String value = intent.getStringExtra(name);
        return value != null && !value.isEmpty() ? value : fallback;
    }
}
