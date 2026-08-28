import "server-only";
import { redactLogValue } from "./redact";

type LogContext = Readonly<Record<string, unknown>>;
type LogLevel = "debug" | "error" | "info" | "warn";

function emit(level: LogLevel, event: string, context: LogContext = {}) {
  const entry = redactLogValue({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  });

  const serialized = JSON.stringify(entry);

  if (level === "error") {
    console.error(serialized);
    return;
  }

  if (level === "warn") {
    console.warn(serialized);
    return;
  }

  console.info(serialized);
}

export const logger = {
  debug(event: string, context?: LogContext) {
    if (process.env.NODE_ENV !== "production") {
      emit("debug", event, context);
    }
  },
  error(event: string, context?: LogContext) {
    emit("error", event, context);
  },
  info(event: string, context?: LogContext) {
    emit("info", event, context);
  },
  warn(event: string, context?: LogContext) {
    emit("warn", event, context);
  },
} as const;
