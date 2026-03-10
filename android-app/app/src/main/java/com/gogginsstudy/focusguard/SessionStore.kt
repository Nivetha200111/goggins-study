package com.gogginsstudy.focusguard

import android.app.usage.UsageStatsManager
import android.content.Context

data class StudySession(
    val goalMinutes: Int,
    val startedAt: Long,
    val endsAt: Long,
) {
    val remainingMs: Long
        get() = (endsAt - System.currentTimeMillis()).coerceAtLeast(0)

    val complete: Boolean
        get() = remainingMs == 0L
}

object SessionStore {
    private const val PREFS = "focus_guard_prefs"
    private const val KEY_GOAL_MINUTES = "goal_minutes"
    private const val KEY_STARTED_AT = "started_at"
    private const val KEY_ENDS_AT = "ends_at"
    private const val KEY_ACTIVE = "active"

    fun saveSession(context: Context, goalMinutes: Int) {
        val startedAt = System.currentTimeMillis()
        val endsAt = startedAt + goalMinutes * 60_000L
        prefs(context).edit()
            .putBoolean(KEY_ACTIVE, true)
            .putInt(KEY_GOAL_MINUTES, goalMinutes)
            .putLong(KEY_STARTED_AT, startedAt)
            .putLong(KEY_ENDS_AT, endsAt)
            .apply()
    }

    fun currentSession(context: Context): StudySession? {
        val prefs = prefs(context)
        if (!prefs.getBoolean(KEY_ACTIVE, false)) return null

        val goalMinutes = prefs.getInt(KEY_GOAL_MINUTES, 50)
        val startedAt = prefs.getLong(KEY_STARTED_AT, 0L)
        val endsAt = prefs.getLong(KEY_ENDS_AT, 0L)
        if (startedAt == 0L || endsAt == 0L) return null

        return StudySession(goalMinutes, startedAt, endsAt)
    }

    fun clearSession(context: Context) {
        prefs(context).edit().clear().apply()
    }

    fun hasUsageAccess(context: Context): Boolean {
        val usageStatsManager =
            context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val end = System.currentTimeMillis()
        val begin = end - 60_000L
        val stats = usageStatsManager.queryUsageStats(
            UsageStatsManager.INTERVAL_DAILY,
            begin,
            end,
        )
        return !stats.isNullOrEmpty()
    }

    private fun prefs(context: Context) =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
}
