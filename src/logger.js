// Frontend Diagnostic & Crash Logger for EmiliaGO
// Captures JS errors, unhandled promise rejections, MediaPipe events, and system telemetry
// and persists them via Android NativeUvcBridge to /sdcard/Android/data/com.emiliago.app/files/emiliago_diagnostic.log

class Logger {
  constructor() {
    this.memoryLogs = [];
    this.maxMemoryLogs = 100;
    this._initGlobalHandlers();
  }

  _initGlobalHandlers() {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      const err = event.error;
      const msg = `${event.message} at ${event.filename}:${event.lineno}:${event.colno}`;
      const stack = err && err.stack ? `\nStack: ${err.stack}` : '';
      this.error('WindowError', msg + stack);
    });

    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const msg =
        typeof reason === 'object' && reason !== null
          ? reason.stack || reason.message || JSON.stringify(reason)
          : String(reason);
      this.error('UnhandledRejection', msg);
    });
  }

  _format(level, tag, message) {
    const d = new Date();
    const pad = (n, len = 2) => String(n).padStart(len, '0');
    const ts = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(
      d.getMilliseconds(),
      3
    )}`;
    return `[${ts}] [${level.padEnd(5)}] [${tag.padEnd(14)}] ${message}`;
  }

  _log(level, tag, message) {
    const formatted = this._format(level, tag, message);
    this.memoryLogs.push(formatted);
    if (this.memoryLogs.length > this.maxMemoryLogs) {
      this.memoryLogs.shift();
    }

    // Console output for dev
    if (level === 'ERROR' || level === 'FATAL') {
      console.error(formatted);
    } else if (level === 'WARN') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    // Forward to Android persistent logger via Native UVC Bridge
    if (
      typeof window !== 'undefined' &&
      window.EmiliaNativeUVC &&
      typeof window.EmiliaNativeUVC.logEvent === 'function'
    ) {
      try {
        window.EmiliaNativeUVC.logEvent(level, tag, message);
      } catch {
        // ignore
      }
    }
  }

  info(tag, message) {
    this._log('INFO', tag, message);
  }

  warn(tag, message) {
    this._log('WARN', tag, message);
  }

  error(tag, message) {
    this._log('ERROR', tag, message);
  }

  fatal(tag, message) {
    this._log('FATAL', tag, message);
  }

  async getCombinedLogs() {
    if (
      typeof window !== 'undefined' &&
      window.EmiliaNativeUVC &&
      typeof window.EmiliaNativeUVC.getDiagnosticLogs === 'function'
    ) {
      try {
        const nativeLogs = window.EmiliaNativeUVC.getDiagnosticLogs();
        if (nativeLogs && nativeLogs.length > 20) {
          return nativeLogs;
        }
      } catch {
        // fallback to memory
      }
    }
    return this.memoryLogs.join('\n') || 'No logs recorded.';
  }

  clear() {
    this.memoryLogs = [];
    if (
      typeof window !== 'undefined' &&
      window.EmiliaNativeUVC &&
      typeof window.EmiliaNativeUVC.clearDiagnosticLogs === 'function'
    ) {
      try {
        window.EmiliaNativeUVC.clearDiagnosticLogs();
      } catch {
        // ignore
      }
    }
  }

  getNativeMemoryStatus() {
    if (
      typeof window !== 'undefined' &&
      window.EmiliaNativeUVC &&
      typeof window.EmiliaNativeUVC.getMemoryTelemetry === 'function'
    ) {
      try {
        return window.EmiliaNativeUVC.getMemoryTelemetry();
      } catch {
        return null;
      }
    }
    return null;
  }

  getLogFilePath() {
    if (
      typeof window !== 'undefined' &&
      window.EmiliaNativeUVC &&
      typeof window.EmiliaNativeUVC.getLogFilePath === 'function'
    ) {
      try {
        return window.EmiliaNativeUVC.getLogFilePath();
      } catch {
        return null;
      }
    }
    return null;
  }
}

export const logger = new Logger();
