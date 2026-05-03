package com.trainre.app;

final class TrainingTimerNotificationConstants {
    static final String CHANNEL_ID = "trainre-training-timer-foreground";
    static final String GROUP = "trainre-training-timers";
    static final String ACTION_START = "com.trainre.app.TRAINING_TIMER_START";
    static final String ACTION_CANCEL = "com.trainre.app.TRAINING_TIMER_CANCEL";
    static final String ACTION_REFRESH = "com.trainre.app.TRAINING_TIMER_REFRESH";
    static final String LAUNCH_ACTION_COMPLETE_SET = "completeSet";
    static final String LAUNCH_ACTION_QUICK_TIMER_TOGGLE = "quickTimerToggle";
    static final String LAUNCH_ACTION_QUICK_TIMER_REPEAT = "quickTimerRepeat";
    static final String EVENT_NOTIFICATION_TAPPED = "trainingTimerNotificationTapped";
    static final String EXTRA_ID = "id";
    static final String EXTRA_TIMER_TYPE = "timerType";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_BODY = "body";
    static final String EXTRA_FINISHED_TITLE = "finishedTitle";
    static final String EXTRA_FINISHED_BODY = "finishedBody";
    static final String EXTRA_ENDS_AT = "endsAt";
    static final String EXTRA_PATH = "path";
    static final String EXTRA_PLAY_FINAL_BEEPS = "playFinalBeeps";
    static final String EXTRA_BEEP_VOLUME = "beepVolume";
    static final String EXTRA_LAUNCH_ACTION = "launchAction";
    static final String EXTRA_EXERCISE_ID = "exerciseId";
    static final String EXTRA_IS_PAUSED = "isPaused";
    static final String EXTRA_REMAINING_MS = "remainingMs";
    static final String EXTRA_TOTAL_SECONDS = "totalSeconds";

    private TrainingTimerNotificationConstants() {}
}
