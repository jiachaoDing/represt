package com.represt.app;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
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
    private static TrainingTimerForegroundService activeInstance;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, TimerRecord> timers = new HashMap<>();
    private MediaPlayer finishSoundPlayer;
    private Runnable stopRunnable;
    private int primaryId;
    private static final int RUNNING_NOTIFICATION_ID = 1;
    private static final int ALARM_REQUEST_CODE_OFFSET = 300000;
    private static final long FINISH_ALERT_RELEASE_DELAY_MS = 1300L;
    private static final long BACKGROUND_FINISH_ALERT_RELEASE_DELAY_MS = 5000L;
    private static final long[] FINISH_VIBRATION_PATTERN_MS = {500L, 240L};
    private static final long[] BACKGROUND_FINISH_VIBRATION_PATTERN_MS = {0L, 500L, 240L};
    private static final String TIMER_PREFS_NAME = "training_timer_alarm_state";
    private static final String TIMER_STATUS_SCHEDULED = "scheduled";
    private static final String TIMER_STATUS_COMPLETED = "completed";
    private static final String TIMER_STATUS_CANCELLED = "cancelled";

    private static final class TimerRecord {
        final int id;
        final Intent intent;
        final long endsAt;
        final long startedAt;
        final boolean playFinalBeeps;
        final boolean repeatFinishAlertInBackground;
        final float beepVolume;
        final boolean isPaused;
        final long remainingMs;
        final int totalSeconds;
        Runnable refreshRunnable;

        TimerRecord(int id, Intent intent, long endsAt, long startedAt, boolean playFinalBeeps, boolean repeatFinishAlertInBackground, float beepVolume, boolean isPaused, long remainingMs, int totalSeconds) {
            this.id = id;
            this.intent = intent;
            this.endsAt = endsAt;
            this.startedAt = startedAt;
            this.playFinalBeeps = playFinalBeeps;
            this.repeatFinishAlertInBackground = repeatFinishAlertInBackground;
            this.beepVolume = beepVolume;
            this.isPaused = isPaused;
            this.remainingMs = remainingMs;
            this.totalSeconds = totalSeconds;
        }
    }

    @Override
    public void onCreate() {
        super.onCreate();
        activeInstance = this;
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

        if (TrainingTimerNotificationConstants.ACTION_FINISH_FROM_ALARM.equals(action)) {
            finishTimerFromAlarm(intent, startId);
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
        stopFinishAlert();
        if (activeInstance == this) {
            activeInstance = null;
        }
        super.onDestroy();
    }

    static void stopFinishAlertFromAppForeground() {
        if (activeInstance != null) {
            activeInstance.stopFinishAlert();
        }
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
            NotificationManager.IMPORTANCE_DEFAULT
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

    public static void notifyAlarmDiagnostic(Context context, Intent intent, String step) {
        // Alarm diagnostics are intentionally silent in the app notification surface.
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
        stopFinishAlert();
        releaseStopCallback();
        TimerRecord record = new TimerRecord(
            id,
            new Intent(intent),
            endsAt,
            System.currentTimeMillis(),
            intent.getBooleanExtra(TrainingTimerNotificationConstants.EXTRA_PLAY_FINAL_BEEPS, false),
            intent.getBooleanExtra(TrainingTimerNotificationConstants.EXTRA_REPEAT_FINISH_ALERT_IN_BACKGROUND, true),
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
            persistTimer(record, TIMER_STATUS_SCHEDULED);
            scheduleFinishAlarm(record);
            scheduleNotificationRefresh(record);
        } else {
            markTimerCancelled(id);
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
            .setSmallIcon(R.drawable.ic_stat_represt_notification)
            .setContentTitle(notificationTitle)
            .setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setContentIntent(buildLaunchIntent(intent))
            .setDeleteIntent(buildRefreshIntent(intent))
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setGroup(TrainingTimerNotificationConstants.GROUP)
            .setShowWhen(false);

        if (isExerciseRestTimer) {
            builder.addAction(
                R.drawable.ic_notification_check,
                getString(R.string.training_timer_complete_set_action),
                buildCompleteSetIntent(intent)
            );
            builder.addAction(
                R.drawable.ic_notification_check,
                getString(R.string.training_timer_skip_rest_action),
                buildSkipRestIntent(intent)
            );
        }

        if (isQuickTimer) {
            builder.addAction(
                R.drawable.ic_notification_check,
                getString(isPaused ? R.string.training_timer_continue_action : R.string.training_timer_pause_action),
                buildQuickTimerToggleIntent(intent)
            );
            builder.addAction(
                R.drawable.ic_notification_check,
                getString(R.string.training_timer_repeat_action),
                buildQuickTimerRepeatIntent(intent)
            );
        }

        return builder.build();
    }

    private Notification buildFinishedNotification(Intent intent) {
        String title = getStringExtra(intent, TrainingTimerNotificationConstants.EXTRA_FINISHED_TITLE, getString(R.string.training_timer_finished_title));
        String body = getStringExtra(intent, TrainingTimerNotificationConstants.EXTRA_FINISHED_BODY, getString(R.string.training_timer_finished_body));

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, TrainingTimerNotificationConstants.FINISHED_CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_represt_notification)
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
            .setShowWhen(true);

        if (isRestTimer(intent) && getExerciseId(intent) != null) {
            builder.addAction(
                R.drawable.ic_notification_check,
                getString(R.string.training_timer_complete_set_action),
                buildCompleteSetIntent(intent)
            );
        }

        if (isQuickTimer(intent)) {
            builder.addAction(
                R.drawable.ic_notification_check,
                getString(R.string.training_timer_repeat_action),
                buildQuickTimerRepeatIntent(intent)
            );
        }

        builder.addAction(
            R.drawable.ic_notification_check,
            getString(R.string.training_timer_open_action),
            buildOpenIntent(intent)
        );

        return builder.build();
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

    private PendingIntent buildSkipRestIntent(Intent sourceIntent) {
        int id = sourceIntent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        Intent launchIntent = new Intent(this, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_PATH, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_PATH))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_EXERCISE_ID, getExerciseId(sourceIntent))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_LAUNCH_ACTION, TrainingTimerNotificationConstants.LAUNCH_ACTION_SKIP_REST);

        return PendingIntent.getActivity(this, id + 110000, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent buildQuickTimerToggleIntent(Intent sourceIntent) {
        int id = sourceIntent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        Intent launchIntent = new Intent(this, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_PATH, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_PATH))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_LAUNCH_ACTION, TrainingTimerNotificationConstants.LAUNCH_ACTION_QUICK_TIMER_TOGGLE);

        return PendingIntent.getActivity(this, id + 120000, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent buildQuickTimerRepeatIntent(Intent sourceIntent) {
        int id = sourceIntent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        Intent launchIntent = new Intent(this, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_PATH, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_PATH))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_LAUNCH_ACTION, TrainingTimerNotificationConstants.LAUNCH_ACTION_QUICK_TIMER_REPEAT);

        return PendingIntent.getActivity(this, id + 130000, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent buildOpenIntent(Intent sourceIntent) {
        int id = sourceIntent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        Intent launchIntent = new Intent(this, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_PATH, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_PATH))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE));

        return PendingIntent.getActivity(this, id + 140000, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent buildRefreshIntent(Intent sourceIntent) {
        int id = sourceIntent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        Intent refreshIntent = new Intent(this, TrainingTimerForegroundService.class)
            .setAction(TrainingTimerNotificationConstants.ACTION_REFRESH)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_ID, id);

        return PendingIntent.getService(this, id + 200000, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent buildFinishAlarmIntent(TimerRecord record, int flags) {
        Intent alarmIntent = new Intent(this, TrainingTimerAlarmReceiver.class)
            .putExtras(record.intent)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_ID, record.id)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_ENDS_AT, record.endsAt);

        return PendingIntent.getBroadcast(this, record.id + ALARM_REQUEST_CODE_OFFSET, alarmIntent, flags | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent buildFinishAlarmIntent(int id, int flags) {
        Intent alarmIntent = new Intent(this, TrainingTimerAlarmReceiver.class);
        return PendingIntent.getBroadcast(this, id + ALARM_REQUEST_CODE_OFFSET, alarmIntent, flags | PendingIntent.FLAG_IMMUTABLE);
    }

    private void scheduleFinishAlarm(TimerRecord record) {
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        PendingIntent alarmIntent = buildFinishAlarmIntent(record, PendingIntent.FLAG_UPDATE_CURRENT);
        if (!canScheduleExactAlarms(alarmManager)) {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, record.endsAt, alarmIntent);
            return;
        }

        PendingIntent showIntent = buildLaunchIntent(record.intent);
        try {
            alarmManager.setAlarmClock(
                new AlarmManager.AlarmClockInfo(record.endsAt, showIntent),
                alarmIntent
            );
        } catch (RuntimeException alarmError) {
            try {
                alarmManager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, record.endsAt, alarmIntent);
            } catch (SecurityException exactAlarmError) {
                alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, record.endsAt, alarmIntent);
            }
        }
    }

    private boolean canScheduleExactAlarms(AlarmManager alarmManager) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms();
    }

    private void cancelFinishAlarm(int id) {
        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarmManager == null) {
            return;
        }

        PendingIntent alarmIntent = buildFinishAlarmIntent(id, PendingIntent.FLAG_NO_CREATE);
        if (alarmIntent != null) {
            alarmManager.cancel(alarmIntent);
            alarmIntent.cancel();
        }
    }

    private SharedPreferences getTimerPrefs() {
        return getSharedPreferences(TIMER_PREFS_NAME, Context.MODE_PRIVATE);
    }

    private String timerStatusKey(int id) {
        return "timer." + id + ".status";
    }

    private String timerEndsAtKey(int id) {
        return "timer." + id + ".endsAt";
    }

    private void persistTimer(TimerRecord record, String status) {
        getTimerPrefs().edit()
            .putString(timerStatusKey(record.id), status)
            .putLong(timerEndsAtKey(record.id), record.endsAt)
            .apply();
    }

    private void markTimerCancelled(int id) {
        if (id == 0) {
            return;
        }

        getTimerPrefs().edit()
            .putString(timerStatusKey(id), TIMER_STATUS_CANCELLED)
            .apply();
        cancelFinishAlarm(id);
    }

    private boolean claimTimerCompletion(int id, long endsAt) {
        if (id == 0 || endsAt <= 0L) {
            return false;
        }

        SharedPreferences prefs = getTimerPrefs();
        long currentEndsAt = prefs.getLong(timerEndsAtKey(id), 0L);
        String status = prefs.getString(timerStatusKey(id), null);
        if (currentEndsAt != endsAt || !TIMER_STATUS_SCHEDULED.equals(status)) {
            return false;
        }

        prefs.edit()
            .putString(timerStatusKey(id), TIMER_STATUS_COMPLETED)
            .apply();
        cancelFinishAlarm(id);
        return true;
    }

    private void playFinishAlert(TimerRecord record, boolean repeatUntilStopped) {
        if (!record.playFinalBeeps) {
            return;
        }

        playFinishTone(record.intent, record.beepVolume, repeatUntilStopped);
        vibrateFinishAlert(repeatUntilStopped);
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

    private void playFinishTone(Intent intent, float volume, boolean repeatUntilStopped) {
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
            finishSoundPlayer.setLooping(repeatUntilStopped);
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

    private void vibrateFinishAlert(boolean repeatUntilStopped) {
        Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator == null || !vibrator.hasVibrator()) {
            return;
        }

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createWaveform(
                    repeatUntilStopped ? BACKGROUND_FINISH_VIBRATION_PATTERN_MS : FINISH_VIBRATION_PATTERN_MS,
                    repeatUntilStopped ? 0 : -1
                ));
            } else {
                vibrator.vibrate(
                    repeatUntilStopped ? BACKGROUND_FINISH_VIBRATION_PATTERN_MS : FINISH_VIBRATION_PATTERN_MS,
                    repeatUntilStopped ? 0 : -1
                );
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

    private void finishTimerFromAlarm(Intent intent, int startId) {
        int id = intent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        long endsAt = intent.getLongExtra(TrainingTimerNotificationConstants.EXTRA_ENDS_AT, 0L);
        if (!claimTimerCompletion(id, endsAt)) {
            stopSelf(startId);
            return;
        }

        TimerRecord record = timers.remove(id);
        if (record == null) {
            record = new TimerRecord(
                id,
                new Intent(intent),
                endsAt,
                System.currentTimeMillis(),
                intent.getBooleanExtra(TrainingTimerNotificationConstants.EXTRA_PLAY_FINAL_BEEPS, false),
                intent.getBooleanExtra(TrainingTimerNotificationConstants.EXTRA_REPEAT_FINISH_ALERT_IN_BACKGROUND, true),
                clampBeepVolume((float) intent.getDoubleExtra(TrainingTimerNotificationConstants.EXTRA_BEEP_VOLUME, 0.2)),
                false,
                0L,
                Math.max(0, intent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_TOTAL_SECONDS, 0))
            );
        }

        completeTimer(record);
    }

    private void finishTimer(int id) {
        TimerRecord record = timers.remove(id);
        if (record == null) {
            return;
        }

        if (!claimTimerCompletion(record.id, record.endsAt)) {
            return;
        }

        completeTimer(record);
    }

    private void completeTimer(TimerRecord record) {
        Notification finishedNotification = buildFinishedNotification(record.intent);
        clearTimerCallbacks(record);
        releaseFinishSoundPlayer();
        try {
            startForeground(RUNNING_NOTIFICATION_ID, finishedNotification);
        } catch (SecurityException notificationError) {
            // Notification permission can change while the timer is running.
        }
        boolean repeatFinishAlert = record.repeatFinishAlertInBackground && !MainActivity.isAppVisible();
        playFinishAlert(record, repeatFinishAlert);
        cancelLegacyRunningNotification(record.id);
        if (!timers.isEmpty()) {
            updatePrimaryTimerNotification();
        }
        notifyTimerFinished(record.id, finishedNotification);
        releaseStopCallback();
        long stopDelayMs = record.playFinalBeeps
            ? repeatFinishAlert ? BACKGROUND_FINISH_ALERT_RELEASE_DELAY_MS : FINISH_ALERT_RELEASE_DELAY_MS
            : 0L;
        stopRunnable = () -> {
            stopFinishAlert();
            if (timers.isEmpty()) {
                removeForegroundNotification();
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
            for (Integer timerId : timers.keySet()) {
                markTimerCancelled(timerId);
            }
            clearAllTimers();
            NotificationManagerCompat.from(this).cancelAll();
            removeForegroundNotification();
            stopSelf();
            return;
        }

        markTimerCancelled(id);
        clearTimer(id);
        cancelLegacyRunningNotification(id);
        updatePrimaryTimerNotification();
        if (timers.isEmpty()) {
            stopFinishAlert();
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

        int recencyComparison = Long.compare(right.startedAt, left.startedAt);
        if (recencyComparison != 0) {
            return recencyComparison;
        }

        long leftTime = left.isPaused ? left.remainingMs : left.endsAt;
        long rightTime = right.isPaused ? right.remainingMs : right.endsAt;
        int timeComparison = Long.compare(leftTime, rightTime);
        return timeComparison != 0 ? timeComparison : Integer.compare(left.id, right.id);
    }

    private void clearTimer(int id) {
        TimerRecord record = timers.remove(id);
        cancelFinishAlarm(id);
        if (record == null) {
            return;
        }
        clearTimerCallbacks(record);
    }

    private void clearTimerCallbacks(TimerRecord record) {
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

    private void stopFinishAlert() {
        releaseFinishSoundPlayer();
        stopFinishVibration();
    }

    private void releaseFinishSoundPlayer() {
        if (finishSoundPlayer != null) {
            finishSoundPlayer.release();
            finishSoundPlayer = null;
        }
    }

    private void stopFinishVibration() {
        Vibrator vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null) {
            vibrator.cancel();
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
