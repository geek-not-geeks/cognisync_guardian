type AppErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

type AppEvents = {
  captureException?: (
    error: unknown,
    context?: Record<string, unknown>,
    options?: AppErrorOptions,
  ) => void;
};

declare global {
  interface Window {
    // Hook point for a real error-monitoring provider (Sentry, etc.) if one
    // is wired up later. Until then, reportAppError falls back to
    // console.error so failures are at least visible in deploy logs.
    __appEvents?: AppEvents;
  }
}

export function reportAppError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const fullContext = {
    source: "react_error_boundary",
    route: window.location.pathname,
    ...context,
  };
  const options: AppErrorOptions = {
    mechanism: "react_error_boundary",
    handled: false,
    severity: "error",
  };

  if (window.__appEvents?.captureException) {
    window.__appEvents.captureException(error, fullContext, options);
    return;
  }

  // No monitoring provider configured — log locally rather than silently
  // dropping the error.
  console.error("[app-error]", error, fullContext);
}
