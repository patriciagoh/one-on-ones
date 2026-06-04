/** A structural subset of a Sentry event — enough to scrub it without importing
 *  the SDK (keeps this module testable + free of a static @sentry dependency). */
export interface ScrubbableEvent {
  request?: { data?: unknown; [k: string]: unknown };
  breadcrumbs?: Array<{ data?: unknown; [k: string]: unknown }>;
  extra?: Record<string, unknown>;
  user?: unknown;
  [k: string]: unknown;
}

/** Remove anything that could carry user content before an event leaves the browser.
 *  NOTE: we intentionally do NOT strip exception messages (event.exception.values[].value) —
 *  those are the actual error signal. The discipline rule is: NEVER throw errors whose
 *  message embeds user content (names/notes/data). Breadcrumbs are dropped entirely
 *  (see dropBreadcrumb) because DOM breadcrumbs capture aria-label text. */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) delete event.request.data;
  if (Array.isArray(event.breadcrumbs)) {
    event.breadcrumbs = event.breadcrumbs.map(({ data: _drop, ...rest }) => rest);
  }
  if (event.extra) delete event.extra;
  if (event.user) delete event.user;
  return event;
}

/** Drop ALL breadcrumbs — DOM/console/fetch breadcrumbs can carry user content
 *  (e.g. aria-label text with report names). Used as Sentry's beforeBreadcrumb. */
export function dropBreadcrumb(): null {
  return null;
}

type SafeContext = Record<string, string | number | boolean>;

let sentry: typeof import("@sentry/react") | null = null;
let active = false;

export function isObservabilityActive(): boolean {
  return active;
}

/** Re-adds only content-free integrations when defaultIntegrations is disabled.
 *  Confirmed present in @sentry/react v10 (re-exported from @sentry/browser):
 *  globalHandlersIntegration, dedupeIntegration, inboundFiltersIntegration,
 *  linkedErrorsIntegration, functionToStringIntegration.
 *  breadcrumbsIntegration is intentionally excluded — see dropBreadcrumb. */
function buildSafeIntegrations(Sentry: typeof import("@sentry/react")) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const safe: any[] = [];
  // auto-capture unhandled errors/rejections (no user content)
  if ("globalHandlersIntegration" in Sentry) safe.push(Sentry.globalHandlersIntegration());
  if ("dedupeIntegration" in Sentry) safe.push(Sentry.dedupeIntegration());
  if ("inboundFiltersIntegration" in Sentry) safe.push(Sentry.inboundFiltersIntegration());
  if ("linkedErrorsIntegration" in Sentry) safe.push(Sentry.linkedErrorsIntegration());
  if ("functionToStringIntegration" in Sentry) safe.push(Sentry.functionToStringIntegration());
  return safe as Parameters<typeof Sentry.init>[0] extends { integrations?: infer I } ? I : never;
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
    defaultIntegrations: false, // CRITICAL: [] would NOT disable defaults (incl. DOM breadcrumbs)
    integrations: buildSafeIntegrations(Sentry),
    tracesSampleRate: 0,
    beforeSend: (event) =>
      scrubEvent(event as unknown as ScrubbableEvent) as unknown as typeof event,
    beforeBreadcrumb: dropBreadcrumb,
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
