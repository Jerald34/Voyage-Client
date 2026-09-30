/**
 * Base API client — fetch wrapper with auth credentials and error handling.
 */

// Same-origin proxy base. The browser hits `/api/*` on the app's own origin and
// Next reverse-proxies to the real backend (see next.config.mjs `rewrites`). This
// keeps the session cookie first-party so it survives iOS standalone-PWA ITP.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export { API_URL };

function describeWait(seconds) {
  if (seconds < 60) return `${seconds} second${seconds === 1 ? "" : "s"}`;
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

/**
 * Error for a non-ok API response. Rate-limited (429) responses get a message
 * that says how long to wait, from the server's Retry-After header, and expose
 * that wait as `error.retryAfter` (seconds) for callers that want to disable UI.
 */
export function createApiError(response, data, fallbackMessage, fallbackCode = "UNKNOWN_ERROR") {
  const error = new Error(data.error?.message || fallbackMessage);
  error.code = data.error?.code || fallbackCode;
  error.status = response.status;
  error.issues = data.error?.issues || [];

  if (response.status === 429) {
    const retryAfter = Number.parseInt(response.headers.get("retry-after") ?? "", 10);
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      error.retryAfter = retryAfter;
      error.message = `Too many requests. Please try again in ${describeWait(retryAfter)}.`;
    }
  }

  return error;
}

export async function fetchApi(path, options = {}) {
  const url = `${API_URL}${path}`;

  const defaultOptions = {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  };

  try {
    const response = await fetch(url, defaultOptions);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw createApiError(response, data, "An unexpected error occurred");
    }

    return data;
  } catch (err) {
    if (err.status) throw err;

    // Network errors or other fetch failures
    const error = new Error("Unable to connect. Please try again.");
    error.code = "NETWORK_ERROR";
    error.status = 0;
    error.issues = [];
    throw error;
  }
}
