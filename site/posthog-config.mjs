export const DEFAULT_POSTHOG_KEY = "phc_qzSxEBzrxYBZZTRHUbRYAsUbTfH5XvBZogErmdwAJx8J";
export const POSTHOG_HOST = "https://us.i.posthog.com";
export const POSTHOG_DEFAULTS = "2026-05-30";

const POSTHOG_KEY_PATTERN = /^phc_[A-Za-z0-9]+$/;
const POSTHOG_KEY_ENV_NAMES = [
  "POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "VITE_POSTHOG_KEY",
];

export function resolvePostHogKey(env = {}) {
  for (const name of POSTHOG_KEY_ENV_NAMES) {
    const value = env?.[name];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (POSTHOG_KEY_PATTERN.test(trimmed)) return trimmed;
  }
  return DEFAULT_POSTHOG_KEY;
}

export function createPostHogOptions() {
  return {
    api_host: POSTHOG_HOST,
    defaults: POSTHOG_DEFAULTS,
    capture_pageview: true,
    person_profiles: "identified_only",
    disable_session_recording: true,
    disable_surveys: true,
  };
}

export function posthogBootstrapScript(env = {}) {
  return `window.__VIBEDECK_ENV__=${JSON.stringify({ POSTHOG_KEY: resolvePostHogKey(env) })};`;
}
