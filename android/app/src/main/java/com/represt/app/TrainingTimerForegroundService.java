package com.represt.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.AssetFileDescriptor;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.HashMap;
import java.io.IOException;
import java.util.Locale;
import java.util.Map;

public class TrainingTimerForegroundService extends Service {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, TimerRecord> timers = new HashMap<>();
    private MediaPlayer finishSoundPlayer;
    private Runnable stopRunnable;
    private int primaryId;
    private static final int RUNNING_NOTIFICATION_ID = 1;
    private static final long FINISH_ALERT_RELEASE_DELAY_MS = 1300L;
    private static final long[] FINISH_VIBRATION_PATTERN_MS = {500L, 240L};

    private static final class TimerRecord {
        final int id;
        final Intent intent;
        final long endsAt;
        final boolean playFinalBeeps;
        final float beepVolume;
        final boolean isPaused;
        final long remainingMs;
        final int totalSeconds;
        Runnable finishRunnable;
        Runnable refreshRunnable;

        TimerRecord(int id, Intent intent, long endsAt, boolean playFinalBeeps, float beepVolume, boolean isPaused, long remainingMs, int totalSeconds) {
            this.id = id;
            this.intent = intent;
            this.endsAt = endsAt;
            this.playFinalBeeps = playFinalBeeps;
            this.beepVolume = beepVolume;
            this.isPaused = isPaused;
            this.remainingMs = remainingMs;
            this.totalSeconds = totalSeconds;
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

        if (TrainingTimerNotificationConstants.ACTION_REFRESH.equals(action)) {
            refreshTimer(intent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0));
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
        releaseFinishSoundPlayer();
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

        NotificationChannel finishedChannel = new NotificationChannel(
            TrainingTimerNotificationConstants.FINISHED_CHANNEL_ID,
            context.getString(R.string.training_timer_finished_channel_name),
            NotificationManager.IMPORTANCE_HIGH
        );
        finishedChannel.setDescription(context.getString(R.string.training_timer_finished_channel_description));
        finishedChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(finishedChannel);
    }

    private void startTimer(Intent intent, int startId) {
        int id = intent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        long endsAt = intent.getLongExtra(TrainingTimerNotificationConstants.EXTRA_ENDS_AT, 0L);
        boolean isPaused = intent.getBooleanExtra(TrainingTimerNotificationConstants.EXTRA_IS_PAUSED, false);
        long remainingMs = Math.max(0L, intent.getLongExtra(TrainingTimerNotificationConstants.EXTRA_REMAINING_MS, 0L));
        if (id == 0 || !canPostNotifications() || (!isPaused && endsAt <= System.currentTimeMillis()) || (isPaused && remainingMs <= 0L)) {
            stopSelf(startId);
            return;
        }

        clearTimer(id);
        cancelLegacyRunningNotification(id);
        releaseStopCallback();
        TimerRecord record = new TimerRecord(
            id,
            new Intent(intent),
            endsAt,
            intent.getBooleanExtra(TrainingTimerNotificationConstants.EXTRA_PLAY_FINAL_BEEPS, false),
            clampBeepVolume((float) intent.getDoubleExtra(TrainingTimerNotificationConstants.EXTRA_BEEP_VOLUME, 0.2)),
            isPaused,
            remainingMs,
            Math.max(0, intent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_TOTAL_SECONDS, 0))
        );
        timers.put(id, record);

        if (!updatePrimaryTimerNotification()) {
            clearTimer(id);
            stopSelf(startId);
            return;
        }

        if (!record.isPaused) {
            scheduleNotificationRefresh(record);
            record.finishRunnable = () -> finishTimer(id);
            handler.postDelayed(record.finishRunnable, Math.max(0L, endsAt - System.currentTimeMillis()));
        }
    }

    private Notification buildRunningNotification(Intent intent, long endsAt) {
        String title = getStringExtra(intent, TrainingTimerNotificationConstants.EXTRA_TITLE, getString(R.string.training_timer_default_title));
        String body = getStringExtra(intent, TrainingTimerNotificationConstants.EXTRA_BODY, getString(R.string.training_timer_default_body));
        boolean isPaused = intent.getBooleanExtra(TrainingTimerNotificationConstants.EXTRA_IS_PAUSED, false);
        long remainingSeconds = isPaused
            ? getRemainingSecondsFromMs(intent.getLongExtra(TrainingTimerNotificationConstants.EXTRA_REMAINING_MS, 0L))
            : getRemainingSeconds(endsAt);
        String remainingTime = formatRemainingTime(remainingSeconds);
        boolean isExerciseRestTimer = isRestTimer(intent) && getExerciseId(intent) != null;
        boolean isQuickTimer = isQuickTimer(intent);
        String notificationTitle = isExerciseRestTimer || isQuickTimer ? remainingTime : title;
        String text = getNotificationText(intent, title, body, remainingTime, isExerciseRestTimer, isQuickTimer);

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, TrainingTimerNotificationConstants.CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_trainre_notification)
            .setContentTitle(notificationTitle)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(buildLaunchIntent(intent))
            .setDeleteIntent(buildRefreshIntent(intent))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setGroup(TrainingTimerNotificationConstants.GROUP)
            .setShowWhen(false);

        if (isExerciseRestTimer) {
            builder.addAction(
                R.drawable.ic_notification_check,
                getString(R.string.training_timer_complete_set_action),
                buildCompleteSetIntent(intent)
            );
        }

        return builder.build();
    }

    private Notification buildFinishedNotification(Intent intent) {
        String title = getStringExtra(intent, TrainingTimerNotificationConstants.EXTRA_FINISHED_TITLE, getString(R.string.training_timer_finished_title));
        String body = getStringExtra(intent, TrainingTimerNotificationConstants.EXTRA_FINISHED_BODY, getString(R.string.training_timer_finished_body));

        return new NotificationCompat.Builder(this, TrainingTimerNotificationConstants.FINISHED_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_trainre_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(buildLaunchIntent(intent))
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setSilent(true)
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

    private PendingIntent buildCompleteSetIntent(Intent sourceIntent) {
        int id = sourceIntent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        Intent launchIntent = new Intent(this, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_PATH, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_PATH))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_EXERCISE_ID, getExerciseId(sourceIntent))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_LAUNCH_ACTION, TrainingTimerNotificationConstants.LAUNCH_ACTION_COMPLETE_SET);

        return PendingIntent.getActivity(this, id + 100000, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent buildRefreshIntent(Intent sourceIntent) {
        int id = sourceIntent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        Intent refreshIntent = new Intent(this, TrainingTimerForegroundService.class)
            .setAction(TrainingTimerNotificationConstants.ACTION_REFRESH)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_ID, id);

        return PendingIntent.getService(this, id + 200000, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void playFinishAlert(TimerRecord record) {
        if (!record.playFinalBeeps) {
            return;
        }

        playFinishTone(record.intent, record.beepVolume);
        vibrateFinishAlert();
    }

    private void scheduleNotificationRefresh(TimerRecord record) {
        record.refreshRunnable = new Runnable() {
            @Override
            public void run() {
                if (!timers.containsKey(record.id)) {
                    return;
                }

                refreshTimer(record.id);
                long remainingMs = record.endsAt - System.currentTimeMillis();
                if (remainingMs > 0L) {
                    handler.postDelayed(this, Math.min(1000L, remainingMs));
                }
            }
        };
        handler.postDelayed(record.refreshRunnable, 1000L);
    }

    private void playFinishTone(Intent intent, float volume) {
        if (volume <= 0f || !shouldPlayServiceTone()) {
            return;
        }

        int soundResourceId = isQuickTimer(intent)
            ? R.raw.quick_timer_finish_notification
            : R.raw.timer_finish_notification;
        try (AssetFileDescriptor soundFile =
                 getResources().openRawResourceFd(soundResourceId)) {
            releaseFinishSoundPlayer();
            finishSoundPlayer = new MediaPlayer();
            finishSoundPlayer.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build());
            finishSoundPlayer.setDataSource(
                soundFile.getFileDescriptor(),
                soundFile.getStartOffset(),
                soundFile.getLength()
            );
            float normalizedVolume = clampBeepVolume(volume);
            finishSoundPlayer.setVolume(normalizedVolume, normalizedVolume);
            finishSoundPlayer.setOnCompletionListener(player -> releaseFinishSoundPlayer());
            finishSoundPlayer.setOnErrorListener((player, what, extra) -> {
                releaseFinishSoundPlayer();
                return true;
            });
            finishSoundPlayer.prepare();
            finishSoundPlayer.start();
        } catch (IOException | RuntimeException audioError) {
            releaseFinishSoundPlayer();
        }
    }

    private void vibrateFinishAlert() {
        Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) {
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(FINISH_VIBRATION_PATTERN_MS, -1));
            } else {
                vibrator.vibrate(FINISH_VIBRATION_PATTERN_MS, -1);
            }
        } catch (RuntimeException vibrationError) {
            // The ending sound still carries the alert if vibration is unavailable.
        }
    }

    private boolean shouldPlayServiceTone() {
        AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null || audioManager.getStreamVolume(AudioManager.STREAM_MUSIC) <= 0) {
            return false;
        }

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
            return true;
        }

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        try {
            return manager == null ||
                manager.getCurrentInterruptionFilter() == NotificationManager.INTERRUPTION_FILTER_ALL;
        } catch (SecurityException policyError) {
            return true;
        }
    }

    private float clampBeepVolume(float volume) {
        if (Float.isNaN(volume)) {
            return 0.2f;
        }

        return Math.max(0f, Math.min(1f, volume));
    }

    private long getRemainingSeconds(long endsAt) {
        long remainingMs = Math.max(0L, endsAt - System.currentTimeMillis());
        return (remainingMs + 999L) / 1000L;
    }

    private long getRemainingSecondsFromMs(long remainingMs) {
        return (Math.max(0L, remainingMs) + 999L) / 1000L;
    }

    private String formatRemainingTime(long remainingSeconds) {
        long minutes = remainingSeconds / 60L;
        long seconds = remainingSeconds % 60L;
        return String.format(Locale.US, "%02d:%02d", minutes, seconds);
    }

    private String getNotificationText(Intent intent, String title, String body, String remainingTime, boolean isExerciseRestTimer, boolean isQuickTimer) {
        if (isExerciseRestTimer) {
            return getString(R.string.training_timer_remaining_format, title, body);
        }

        if (isQuickTimer) {
            int totalSeconds = Math.max(0, intent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_TOTAL_SECONDS, 0));
            String totalTime = totalSeconds > 0 ? formatRemainingTime(totalSeconds) : remainingTime;
            return getString(R.string.training_timer_total_time_format, totalTime);
        }

        return getString(R.string.training_timer_remaining_format, body, remainingTime);
    }

    private void finishTimer(int id) {
        TimerRecord record = timers.remove(id);
        if (record == null) {
            return;
        }

        Notification finishedNotification = buildFinishedNotification(record.intent);
        clearTimerCallbacks(record);
        releaseFinishSoundPlayer();
        playFinishAlert(record);
        cancelLegacyRunningNotification(id);
        updatePrimaryTimerNotification();
        notifyTimerFinished(id, finishedNotification);
        releaseStopCallback();
        long stopDelayMs = record.playFinalBeeps ? FINISH_ALERT_RELEASE_DELAY_MS : 0L;
        stopRunnable = () -> {
            releaseFinishSoundPlayer();
            if (timers.isEmpty()) {
                stopSelf();
            }
        };
        handler.postDelayed(stopRunnable, stopDelayMs);
    }

    private void refreshTimer(int id) {
        TimerRecord record = timers.get(id);
        if (record == null || !canPostNotifications()) {
            return;
        }

        if (!updatePrimaryTimerNotification()) {
            cancelTimer(id);
        }
    }

    private void cancelTimer(int id) {
        if (id == 0) {
            clearAllTimers();
            NotificationManagerCompat.from(this).cancelAll();
            removeForegroundNotification();
            stopSelf();
            return;
        }

        clearTimer(id);
        cancelLegacyRunningNotification(id);
        updatePrimaryTimerNotification();
        if (timers.isEmpty()) {
            releaseFinishSoundPlayer();
            stopSelf();
        }
    }

    private void notifyTimerFinished(int id, Notification notification) {
        if (!canPostNotifications()) {
            return;
        }

        try {
            NotificationManagerCompat.from(this).notify(id, notification);
        } catch (SecurityException notificationError) {
            // Notification permission can change while the timer is running.
        }
    }

    private void removeForegroundNotification() {
        stopForeground(Service.STOP_FOREGROUND_REMOVE);
    }

    private void cancelLegacyRunningNotification(int id) {
        NotificationManagerCompat.from(this).cancel(id);
    }

    private boolean updatePrimaryTimerNotification() {
        if (timers.isEmpty()) {
            primaryId = 0;
            removeForegroundNotification();
            return true;
        }

        TimerRecord nextRecord = getNextPrimaryTimer();
        primaryId = nextRecord.id;
        try {
            startForeground(
                RUNNING_NOTIFICATION_ID,
                buildRunningNotification(nextRecord.intent, nextRecord.endsAt)
            );
            return true;
        } catch (SecurityException notificationError) {
            return false;
        }
    }

    private TimerRecord getNextPrimaryTimer() {
        TimerRecord nextRecord = null;
        for (TimerRecord record : timers.values()) {
            if (nextRecord == null || compareTimerPriority(record, nextRecord) < 0) {
                nextRecord = record;
            }
        }

        return nextRecord;
    }

    private int compareTimerPriority(TimerRecord left, TimerRecord right) {
        if (left.isPaused != right.isPaused) {
            return left.isPaused ? 1 : -1;
        }

        long leftTime = left.isPaused ? left.remainingMs : left.endsAt;
        long rightTime = right.isPaused ? right.remainingMs : right.endsAt;
        int timeComparison = Long.compare(leftTime, rightTime);
        return timeComparison != 0 ? timeComparison : Integer.compare(left.id, right.id);
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
        if (record.refreshRunnable != null) {
            handler.removeCallbacks(record.refreshRunnable);
            record.refreshRunnable = null;
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

    private void releaseFinishSoundPlayer() {
        if (finishSoundPlayer != null) {
            finishSoundPlayer.release();
            finishSoundPlayer = null;
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

    private boolean isRestTimer(Intent intent) {
        return "rest".equals(intent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE));
    }

    private boolean isQuickTimer(Intent intent) {
        return "quick".equals(intent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE));
    }

    private String getExerciseId(Intent intent) {
        String path = intent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_PATH);
        if (path == null || !path.startsWith("/exercise/")) {
            return null;
        }

        return path.substring("/exercise/".length());
    }
}
