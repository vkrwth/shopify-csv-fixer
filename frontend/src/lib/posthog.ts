import posthog from "posthog-js";

const key = import.meta.env.VITE_POSTHOG_KEY;
const host = import.meta.env.VITE_POSTHOG_HOST ?? "https://eu.i.posthog.com";

if (key) {
  posthog.init(key, {
    api_host: host,
    defaults: "2026-01-30",
    person_profiles: "identified_only",
    autocapture: false,
    capture_pageview: true,
    disable_session_recording: true,
  });
}

export function track(event: string, metadata: Record<string, unknown> = {}): void {
  if (!key) return;
  try {
    posthog.capture(event, metadata);
  } catch {
    // analytics must never break the app
  }
}

export default posthog;
