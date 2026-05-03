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
import android.media.AudioAttributes;
import android.media.AudioFormat;
import android.media.AudioManager;
import android.media.AudioTrack;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class TrainingTimerForegroundService extends Service {
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Map<Integer, TimerRecord> timers = new HashMap<>();
    private AudioTrack audioTrack;
    private Runnable stopRunnable;
    private int primaryId;
    private static final int TONE_SAMPLE_RATE = 44100;

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
        Runnable beepRunnable;
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
        releaseAudioTrack();
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
        boolean isPaused = intent.getBooleanExtra(TrainingTimerNotificationConstants.EXTRA_IS_PAUSED, false);
        long remainingMs = Math.max(0L, intent.getLongExtra(TrainingTimerNotificationConstants.EXTRA_REMAINING_MS, 0L));
        if (id == 0 || !canPostNotifications() || (!isPaused && endsAt <= System.currentTimeMillis()) || (isPaused && remainingMs <= 0L)) {
            stopSelf(startId);
            return;
        }

        clearTimer(id);
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

        if (!record.isPaused) {
            scheduleFinalBeeps(record);
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
        } else if (isQuickTimer) {
            builder.addAction(
                isPaused ? R.drawable.ic_notification_play : R.drawable.ic_notification_pause,
                getString(isPaused ? R.string.training_timer_quick_start_action : R.string.training_timer_quick_pause_action),
                buildQuickTimerActionIntent(intent, TrainingTimerNotificationConstants.LAUNCH_ACTION_QUICK_TIMER_TOGGLE, 100000)
            );
            builder.addAction(
                R.drawable.ic_notification_repeat,
                getString(R.string.training_timer_quick_repeat_action),
                buildQuickTimerActionIntent(intent, TrainingTimerNotificationConstants.LAUNCH_ACTION_QUICK_TIMER_REPEAT, 200000)
            );
        }

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

    private PendingIntent buildQuickTimerActionIntent(Intent sourceIntent, String launchAction, int requestCodeOffset) {
        int id = sourceIntent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        Intent launchIntent = new Intent(this, MainActivity.class)
            .setAction(Intent.ACTION_MAIN)
            .addCategory(Intent.CATEGORY_LAUNCHER)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_PATH, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_PATH))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE, sourceIntent.getStringExtra(TrainingTimerNotificationConstants.EXTRA_TIMER_TYPE))
            .putExtra(TrainingTimerNotificationConstants.EXTRA_LAUNCH_ACTION, launchAction);

        return PendingIntent.getActivity(this, id + requestCodeOffset, launchIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent buildRefreshIntent(Intent sourceIntent) {
        int id = sourceIntent.getIntExtra(TrainingTimerNotificationConstants.EXTRA_ID, 0);
        Intent refreshIntent = new Intent(this, TrainingTimerForegroundService.class)
            .setAction(TrainingTimerNotificationConstants.ACTION_REFRESH)
            .putExtra(TrainingTimerNotificationConstants.EXTRA_ID, id);

        return PendingIntent.getService(this, id + 200000, refreshIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
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

                playBeep(record.beepVolume);
                beepCount += 1;
                handler.postDelayed(this, 1000L);
            }
        };
        handler.postDelayed(record.beepRunnable, firstBeepDelay);
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

    private void playBeep(float volume) {
        playTone(false, 120, volume, 0.75f);
    }

    private void playFinishTone(float volume) {
        playTone(true, 620, volume, 1.0f);
    }

    private void playTone(boolean isFinishTone, int durationMs, float volume, float scale) {
        if (volume <= 0f || !shouldPlayServiceTone()) {
            return;
        }

        try {
            releaseAudioTrack();
            short[] samples = buildToneSamples(isFinishTone, durationMs, getToneAmplitude(volume, scale));
            audioTrack = new AudioTrack.Builder()
                .setAudioAttributes(new AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build())
                .setAudioFormat(new AudioFormat.Builder()
                    .setSampleRate(TONE_SAMPLE_RATE)
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build())
                .setBufferSizeInBytes(samples.length * 2)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build();
            audioTrack.write(samples, 0, samples.length);
            audioTrack.play();
        } catch (RuntimeException audioError) {
            releaseAudioTrack();
        }
    }

    private boolean shouldPlayServiceTone() {
        AudioManager audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null || audioManager.getStreamVolume(AudioManager.STREAM_MUSIC) <= 0) {
            return false;
        }

        if (audioManager.getRingerMode() != AudioManager.RINGER_MODE_NORMAL) {
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

    private float getToneAmplitude(float volume, float scale) {
        float normalizedVolume = clampBeepVolume(volume);
        if (normalizedVolume <= 0f) {
            return 0f;
        }

        return Math.min(1f, (0.45f + normalizedVolume * 0.55f) * scale);
    }

    private short[] buildToneSamples(boolean isFinishTone, int durationMs, float amplitude) {
        int sampleCount = Math.max(1, TONE_SAMPLE_RATE * durationMs / 1000);
        short[] samples = new short[sampleCount];
        double twoPi = Math.PI * 2;
        int fadeSamples = Math.min(sampleCount / 2, TONE_SAMPLE_RATE / 200);

        for (int index = 0; index < sampleCount; index += 1) {
            double elapsedSeconds = index / (double) TONE_SAMPLE_RATE;
            double frequency = isFinishTone ? 880.0 + 420.0 * index / sampleCount : 1280.0;
            double wave = Math.sin(twoPi * frequency * elapsedSeconds);
            if (isFinishTone) {
                wave += 0.45 * Math.sin(twoPi * frequency * 1.5 * elapsedSeconds);
            }

            double envelope = 1.0;
            if (fadeSamples > 0 && index < fadeSamples) {
                envelope = index / (double) fadeSamples;
            } else if (fadeSamples > 0 && index > sampleCount - fadeSamples) {
                envelope = (sampleCount - index) / (double) fadeSamples;
            }

            samples[index] = (short) Math.round(
                Math.max(-1.0, Math.min(1.0, wave)) * envelope * amplitude * Short.MAX_VALUE
            );
        }

        return samples;
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

        clearTimerCallbacks(record);
        if (record.playFinalBeeps) {
            playFinishTone(record.beepVolume);
        } else {
            releaseAudioTrack();
        }
        if (id == primaryId) {
            if (timers.isEmpty()) {
                primaryId = 0;
                removeForegroundNotification();
            } else {
                promotePrimaryTimer();
                NotificationManagerCompat.from(this).cancel(id);
            }
        } else {
            NotificationManagerCompat.from(this).cancel(id);
        }
        releaseStopCallback();
        stopRunnable = () -> {
            releaseAudioTrack();
            if (timers.isEmpty()) {
                stopSelf();
            }
        };
        handler.postDelayed(stopRunnable, record.playFinalBeeps ? 650L : 0L);
    }

    private void refreshTimer(int id) {
        TimerRecord record = timers.get(id);
        if (record == null || !canPostNotifications()) {
            return;
        }

        Notification notification = buildRunningNotification(record.intent, record.endsAt);
        try {
            if (id == primaryId) {
                startForeground(id, notification);
            } else {
                NotificationManagerCompat.from(this).notify(id, notification);
            }
        } catch (SecurityException notificationError) {
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
            releaseAudioTrack();
            stopSelf();
        }
    }

    private void removeForegroundNotification() {
        stopForeground(Service.STOP_FOREGROUND_REMOVE);
    }

    private void promotePrimaryTimer() {
        if (timers.isEmpty()) {
            primaryId = 0;
            removeForegroundNotification();
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

    private void releaseAudioTrack() {
        if (audioTrack != null) {
            audioTrack.release();
            audioTrack = null;
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
