/** A structural subset of a Sentry event — enough to scrub it without importing
 *  the SDK (keeps this module testable + free of a static @sentry dependency). */
export interface ScrubbableEvent {
  request?: { data?: unknown; [k: string]: unknown };
  breadcrumbs?: Array<{ data?: unknown; [k: string]: unknown }>;
  extra?: Record<string, unknown>;
  [k: string]: unknown;
}

/** Remove anything that could carry user content before an event leaves the browser. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) delete event.request.data;
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map(({ data: _drop, ...rest }) => rest);
  }
  if (event.extra) delete event.extra;
  return event;
}

type SafeContext = Record<string, string | number | boolean>;

let sentry: typeof import("@sentry/react") | null = null;
let active = false;

export function isObservabilityActive(): boolean {
  return active;
}

/** Initializes Sentry ONLY if a DSN is configured (off by default). Dynamically
 *  imports the SDK so builds without a DSN (the demo) never ship it. */
export async function initObservability(): Promise<void> {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || active) return;
  const Sentry = await import("@sentry/react");
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    sendDefaultPii: false,
    integrations: [],
    tracesSampleRate: 0,
    beforeSend: (event) =>
      scrubEvent(event as unknown as ScrubbableEvent) as unknown as Parameters<
        NonNullable<Parameters<typeof Sentry.init>[0]["beforeSend"]>
      >[0],
    beforeBreadcrumb: (crumb) => {
      if (crumb.data) crumb.data = undefined;
      return crumb;
    },
  });
  sentry = Sentry;
  active = true;
}

/** Report an error with optional SAFE context (sent as tags — never `extra`,
 *  which the scrubber drops). No-op unless observability is active. */
export function captureError(err: unknown, context?: SafeContext): void {
  if (!sentry) return;
  sentry.captureException(err, context ? { tags: context } : undefined);
}
