package com.trainre.app;

final class TrainingTimerNotificationConstants {
    static final String CHANNEL_ID = "trainre-training-timer-foreground";
    static final String GROUP = "trainre-training-timers";
    static final String ACTION_START = "com.trainre.app.TRAINING_TIMER_START";
    static final String ACTION_CANCEL = "com.trainre.app.TRAINING_TIMER_CANCEL";
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

    private TrainingTimerNotificationConstants() {}
}
