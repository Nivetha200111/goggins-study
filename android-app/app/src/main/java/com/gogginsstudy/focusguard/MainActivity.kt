package com.gogginsstudy.focusguard

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity() {
    private lateinit var goalInput: EditText
    private lateinit var statusValue: TextView
    private lateinit var accessValue: TextView
    private lateinit var notesValue: TextView
    private val handler = Handler(Looper.getMainLooper())

    private val refreshRunnable = object : Runnable {
        override fun run() {
            refreshUi()
            handler.postDelayed(this, 1000L)
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        goalInput = findViewById(R.id.goalInput)
        statusValue = findViewById(R.id.statusValue)
        accessValue = findViewById(R.id.accessValue)
        notesValue = findViewById(R.id.notesValue)

        requestNotificationPermissionIfNeeded()

        findViewById<Button>(R.id.startButton).setOnClickListener { startSession() }
        findViewById<Button>(R.id.stopButton).setOnClickListener { stopSession() }
        findViewById<Button>(R.id.usageButton).setOnClickListener {
            startActivity(Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS))
        }
        findViewById<Button>(R.id.notificationButton).setOnClickListener {
            startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
            })
        }

        SessionStore.currentSession(this)?.let {
            goalInput.setText(it.goalMinutes.toString())
        }
    }

    override fun onStart() {
        super.onStart()
        handler.post(refreshRunnable)
    }

    override fun onStop() {
        handler.removeCallbacks(refreshRunnable)
        super.onStop()
    }

    private fun startSession() {
        val goalMinutes = goalInput.text.toString().toIntOrNull()?.coerceIn(15, 480) ?: 50
        val serviceIntent = Intent(this, FocusGuardService::class.java).apply {
            action = FocusGuardService.ACTION_START
            putExtra(FocusGuardService.EXTRA_GOAL_MINUTES, goalMinutes)
        }
        ContextCompat.startForegroundService(this, serviceIntent)
        refreshUi()
    }

    private fun stopSession() {
        val serviceIntent = Intent(this, FocusGuardService::class.java).apply {
            action = FocusGuardService.ACTION_STOP
        }
        startService(serviceIntent)
        SessionStore.clearSession(this)
        refreshUi()
    }

    private fun refreshUi() {
        val session = SessionStore.currentSession(this)
        val hasUsageAccess = SessionStore.hasUsageAccess(this)

        accessValue.text = if (hasUsageAccess) {
            "Granted"
        } else {
            "Missing"
        }

        statusValue.text = if (session == null) {
            "No active study timer."
        } else if (session.complete) {
            "Goal complete. You can stop the monitor now."
        } else {
            "Running: ${formatDuration(session.remainingMs)} left."
        }

        notesValue.text = if (hasUsageAccess) {
            "Blocked apps: Instagram, LinkedIn, WhatsApp"
        } else {
            "Grant Usage Access or the app cannot see foreground apps."
        }
    }

    private fun requestNotificationPermissionIfNeeded() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return

        if (
            ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
        ) {
            requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), 1001)
        }
    }

    private fun formatDuration(totalMs: Long): String {
        val totalSeconds = (totalMs / 1000L).coerceAtLeast(0L)
        val hours = totalSeconds / 3600L
        val minutes = (totalSeconds % 3600L) / 60L
        val seconds = totalSeconds % 60L

        return if (hours > 0) {
            "%d:%02d:%02d".format(hours, minutes, seconds)
        } else {
            "%02d:%02d".format(minutes, seconds)
        }
    }
}
