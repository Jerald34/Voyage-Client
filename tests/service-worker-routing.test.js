import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import vm from "node:vm";

const APP_ORIGIN = "https://voyage.smurfing.dev";

// Load public/sw.js into a sandbox and capture its fetch listener, so we can
// check which requests the worker takes over (respondWith) and which it leaves
// to the browser.
function loadFetchHandler() {
  const listeners = {};
  const self = {
    location: new URL(`${APP_ORIGIN}/sw.js`),
    addEventListener: (type, fn) => {
      listeners[type] = fn;
    },
  };
  const source = readFileSync(resolve(__dirname, "../public/sw.js"), "utf8");
  vm.runInNewContext(source, {
    self,
    URL,
    Response,
    caches: { open: async () => ({}), match: async () => undefined },
    fetch: async () => new Response(""),
  });
  return listeners.fetch;
}

function isHandledByWorker(url, { accept = "*/*", mode = "cors" } = {}) {
  const handler = loadFetchHandler();
  let handled = false;
  handler({
    request: { url, method: "GET", mode, headers: new Headers({ accept }) },
    respondWith: (promise) => {
      handled = true;
      promise?.catch?.(() => {});
    },
  });
  return handled;
}

describe("service worker routing", () => {
  it("leaves the agent SSE stream on a separate API origin to the browser", () => {
    expect(
      isHandledByWorker("https://smurfing.dev/agencies/a1/agent/runs/r1/stream", {
        accept: "text/event-stream",
      })
    ).toBe(false);
  });

  it("does not cache authenticated API reads on a separate API origin", () => {
    expect(isHandledByWorker("https://smurfing.dev/agencies/a1/agent/threads/t1/messages")).toBe(false);
    expect(isHandledByWorker("https://smurfing.dev/auth/me")).toBe(false);
  });

  it("leaves any event-stream request to the browser, even same-origin", () => {
    expect(
      isHandledByWorker(`${APP_ORIGIN}/api/stream?agencyId=a1&runId=r1`, { accept: "text/event-stream" })
    ).toBe(false);
    expect(isHandledByWorker(`${APP_ORIGIN}/some/stream`, { accept: "text/event-stream" })).toBe(false);
  });

  it("leaves same-origin /api proxy calls to the browser", () => {
    expect(isHandledByWorker(`${APP_ORIGIN}/api/auth/me`)).toBe(false);
  });

  it("still caches the app's own static assets and Google Fonts", () => {
    expect(isHandledByWorker(`${APP_ORIGIN}/_next/static/chunks/main.js`)).toBe(true);
    expect(isHandledByWorker(`${APP_ORIGIN}/icon.svg`)).toBe(true);
    expect(isHandledByWorker("https://fonts.gstatic.com/s/inter/v1/font.woff2")).toBe(true);
  });
});
