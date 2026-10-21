package com.emiliago.app;

import android.content.Context;
import android.os.Build;
import android.os.Debug;
import android.os.Environment;
import android.util.Log;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * EmiliaLogger: Persistent Diagnostic & Crash Logger for EmiliaGO! on NVIDIA Shield TV.
 *
 * Writes native Java uncaught exceptions, WebView renderer crashes, JNI events,
 * and JavaScript errors/telemetry to a persistent log file on disk:
 *   /sdcard/Android/data/com.emiliago.app/files/emiliago_diagnostic.log
 *
 * Can be pulled anytime via ADB:
 *   adb pull /sdcard/Android/data/com.emiliago.app/files/emiliago_diagnostic.log .
 * Or viewed in the Parent Settings drawer directly on the TV!
 */
public class EmiliaLogger {
    private static final String TAG = "EmiliaGO_Log";
    private static final String LOG_FILE_NAME = "emiliago_diagnostic.log";
    private static final long MAX_LOG_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB max with auto-rotation

    private static File sLogFile = null;
    private static final SimpleDateFormat DATE_FORMAT =
            new SimpleDateFormat("yyyy-MM-dd HH:mm:ss.SSS", Locale.US);

    private static final Object LOCK = new Object();

    public static void init(Context context) {
        synchronized (LOCK) {
            try {
                File dir = context.getExternalFilesDir(null);
                if (dir == null) {
                    dir = context.getFilesDir();
                }
                if (dir != null && !dir.exists()) {
                    dir.mkdirs();
                }
                sLogFile = new File(dir, LOG_FILE_NAME);

                // Install global UncaughtExceptionHandler for all native Java threads
                Thread.UncaughtExceptionHandler defaultHandler = Thread.getDefaultUncaughtExceptionHandler();
                Thread.setDefaultUncaughtExceptionHandler((thread, throwable) -> {
                    try {
                        StringWriter sw = new StringWriter();
                        PrintWriter pw = new PrintWriter(sw);
                        throwable.printStackTrace(pw);
                        String stackTrace = sw.toString();

                        String crashMsg = "FATAL UNCAUGHT EXCEPTION in thread [" + thread.getName() + "]:\n" + stackTrace;
                        log("FATAL", "UncaughtException", crashMsg);
                        logMemoryStats("Crash Snapshot");
                    } catch (Exception e) {
                        Log.e(TAG, "Error writing crash log", e);
                    }

                    if (defaultHandler != null) {
                        defaultHandler.uncaughtException(thread, throwable);
                    }
                });

                log("INFO", "Init", "==================================================");
                log("INFO", "Init", "EmiliaGO! Starting on " + Build.MANUFACTURER + " " + Build.MODEL + " (Android " + Build.VERSION.RELEASE + ", API " + Build.VERSION.SDK_INT + ")");
                log("INFO", "Init", "Primary ABI: " + Build.SUPPORTED_ABIS[0] + " | Log file: " + sLogFile.getAbsolutePath());
                logMemoryStats("Startup");
            } catch (Exception e) {
                Log.e(TAG, "Failed to initialize EmiliaLogger", e);
            }
        }
    }

    public static void log(String level, String tag, String message) {
        String timestamp = DATE_FORMAT.format(new Date());
        String logLine = String.format(Locale.US, "[%s] [%-5s] [%-16s] %s\n", timestamp, level, tag, message);

        // Also output to Android logcat
        switch (level) {
            case "FATAL":
            case "ERROR":
                Log.e(tag, message);
                break;
            case "WARN":
                Log.w(tag, message);
                break;
            case "DEBUG":
                Log.d(tag, message);
                break;
            default:
                Log.i(tag, message);
                break;
        }

        synchronized (LOCK) {
            if (sLogFile == null) return;
            try {
                // Rotate if file exceeds 2 MB
                if (sLogFile.exists() && sLogFile.length() > MAX_LOG_SIZE_BYTES) {
                    File oldFile = new File(sLogFile.getParentFile(), LOG_FILE_NAME + ".old");
                    if (oldFile.exists()) oldFile.delete();
                    sLogFile.renameTo(oldFile);
                }

                try (FileOutputStream fos = new FileOutputStream(sLogFile, true);
                     OutputStreamWriter osw = new OutputStreamWriter(fos, StandardCharsets.UTF_8)) {
                    osw.write(logLine);
                    osw.flush();
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to append log line to disk", e);
            }
        }
    }

    public static void logMemoryStats(String reason) {
        Runtime rt = Runtime.getRuntime();
        long maxMem = rt.maxMemory() / (1024 * 1024);
        long totalMem = rt.totalMemory() / (1024 * 1024);
        long freeMem = rt.freeMemory() / (1024 * 1024);
        long usedMem = totalMem - freeMem;
        long nativeHeap = Debug.getNativeHeapAllocatedSize() / (1024 * 1024);

        String stats = String.format(
            Locale.US,
            "Memory [%s]: Java Heap: %dMB used / %dMB total (Max: %dMB) | Native Heap: %dMB",
            reason, usedMem, totalMem, maxMem, nativeHeap
        );
        log("INFO", "MemoryTelemetry", stats);
    }

    public static String getLogFilePath() {
        return sLogFile != null ? sLogFile.getAbsolutePath() : "Not initialized";
    }

    public static String getRecentLogs(int maxLines) {
        synchronized (LOCK) {
            if (sLogFile == null || !sLogFile.exists()) {
                return "No diagnostic logs recorded yet.";
            }
            try {
                java.util.List<String> lines = new java.util.ArrayList<>();
                try (java.io.BufferedReader br = new java.io.BufferedReader(
                        new java.io.InputStreamReader(new java.io.FileInputStream(sLogFile), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = br.readLine()) != null) {
                        lines.add(line);
                        if (lines.size() > maxLines * 2) {
                            lines.remove(0);
                        }
                    }
                }
                int start = Math.max(0, lines.size() - maxLines);
                StringBuilder sb = new StringBuilder();
                for (int i = start; i < lines.size(); i++) {
                    sb.append(lines.get(i)).append("\n");
                }
                return sb.toString();
            } catch (Exception e) {
                return "Error reading diagnostic logs: " + e.getMessage();
            }
        }
    }

    public static void clearLogs() {
        synchronized (LOCK) {
            if (sLogFile != null && sLogFile.exists()) {
                sLogFile.delete();
            }
            log("INFO", "LogClean", "Diagnostic log cleared by user.");
        }
    }
}
