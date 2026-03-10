package com.gogginsstudy.focusguard

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.speech.tts.TextToSpeech
import androidx.core.app.NotificationCompat
import java.util.Locale

class FocusGuardService : Service(), TextToSpeech.OnInitListener {
    private val handler = Handler(Looper.getMainLooper())
    private val monitorRunnable = object : Runnable {
        override fun run() {
            inspectForegroundApp()
            handler.postDelayed(this, 2500L)
        }
    }

    private lateinit var notificationManager: NotificationManager
    private lateinit var usageStatsManager: UsageStatsManager
    private var textToSpeech: TextToSpeech? = null
    private var lastWarnedPackage: String? = null
    private var lastWarnedAt: Long = 0L

    override fun onCreate() {
        super.onCreate()
        notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        usageStatsManager =
            getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        createNotificationChannel()
        textToSpeech = TextToSpeech(this, this)
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                val goalMinutes = intent.getIntExtra(EXTRA_GOAL_MINUTES, 50).coerceIn(15, 480)
                SessionStore.saveSession(this, goalMinutes)
                startForeground(SERVICE_NOTIFICATION_ID, buildServiceNotification())
                startMonitoring()
            }

            ACTION_STOP -> {
                stopMonitoring()
                stopSelf()
            }
        }

        return START_STICKY
    }

    override fun onDestroy() {
        stopMonitoring()
        textToSpeech?.stop()
        textToSpeech?.shutdown()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            textToSpeech?.language = Locale.US
        }
    }

    private fun startMonitoring() {
        handler.removeCallbacks(monitorRunnable)
        handler.post(monitorRunnable)
    }

    private fun stopMonitoring() {
        handler.removeCallbacks(monitorRunnable)
        SessionStore.clearSession(this)
        stopForeground(STOP_FOREGROUND_REMOVE)
    }

    private fun inspectForegroundApp() {
        val session = SessionStore.currentSession(this) ?: return
        notificationManager.notify(SERVICE_NOTIFICATION_ID, buildServiceNotification())

        if (session.complete) {
            lastWarnedPackage = null
            return
        }

        val activePackage = currentForegroundPackage() ?: return
        val blockedLabel = BLOCKED_PACKAGES[activePackage] ?: return
        val now = System.currentTimeMillis()

        if (activePackage == lastWarnedPackage && now - lastWarnedAt < WARNING_COOLDOWN_MS) {
            return
        }

        lastWarnedPackage = activePackage
        lastWarnedAt = now

        val warning = "Timer unfinished. Close $blockedLabel and get back to study."
        notificationManager.notify(
            ALERT_NOTIFICATION_ID,
            NotificationCompat.Builder(this, ALERT_CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_alert)
                .setContentTitle("FocusGuard warning")
                .setContentText(warning)
                .setStyle(NotificationCompat.BigTextStyle().bigText(warning))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .build(),
        )

        textToSpeech?.speak(warning, TextToSpeech.QUEUE_FLUSH, null, "focus-warning")
    }

    private fun currentForegroundPackage(): String? {
        val end = System.currentTimeMillis()
        val begin = end - 15_000L
        val usageEvents = usageStatsManager.queryEvents(begin, end)
        val event = UsageEvents.Event()
        var latestPackage: String? = null
        var latestTimestamp = 0L

        while (usageEvents.hasNextEvent()) {
            usageEvents.getNextEvent(event)
            if (
                event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND &&
                event.timeStamp >= latestTimestamp
            ) {
                latestTimestamp = event.timeStamp
                latestPackage = event.packageName
            }
        }

        return latestPackage
    }

    private fun buildServiceNotification(): Notification {
        val session = SessionStore.currentSession(this)
        val content = session?.let {
            if (it.complete) {
                "Study goal complete. End the session when you are done."
            } else {
                "Watching distracting apps. ${it.remainingMs / 60_000L} minutes left."
            }
        } ?: "Ready to monitor your study timer."

        return NotificationCompat.Builder(this, SERVICE_CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("FocusGuard active")
            .setContentText(content)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val serviceChannel = NotificationChannel(
            SERVICE_CHANNEL_ID,
            "FocusGuard service",
            NotificationManager.IMPORTANCE_LOW,
        )

        val alertChannel = NotificationChannel(
            ALERT_CHANNEL_ID,
            "FocusGuard alerts",
            NotificationManager.IMPORTANCE_HIGH,
        )

        notificationManager.createNotificationChannel(serviceChannel)
        notificationManager.createNotificationChannel(alertChannel)
    }

    companion object {
        const val ACTION_START = "com.gogginsstudy.focusguard.START"
        const val ACTION_STOP = "com.gogginsstudy.focusguard.STOP"
        const val EXTRA_GOAL_MINUTES = "goal_minutes"

        private const val SERVICE_CHANNEL_ID = "focus_guard_service"
        private const val ALERT_CHANNEL_ID = "focus_guard_alerts"
        private const val SERVICE_NOTIFICATION_ID = 1001
        private const val ALERT_NOTIFICATION_ID = 1002
        private const val WARNING_COOLDOWN_MS = 10_000L

        private val BLOCKED_PACKAGES = mapOf(
            "com.instagram.android" to "Instagram",
            "com.linkedin.android" to "LinkedIn",
            "com.whatsapp" to "WhatsApp",
        )
    }
}
