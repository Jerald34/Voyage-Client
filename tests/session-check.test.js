import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  SESSION_CHECK_ATTR,
  SESSION_CHECK_SCRIPT,
  endSessionCheck,
  hasStoredUser,
} from "../app/lib/sessionCheck.js";

// Runs the inline layout script as the browser would, at the given URL.
function runScriptAt(url) {
  window.history.replaceState(null, "", url);
  // eslint-disable-next-line no-new-func
  new Function(SESSION_CHECK_SCRIPT)();
}

const root = () => document.documentElement;

beforeEach(() => {
  window.localStorage.clear();
  root().removeAttribute(SESSION_CHECK_ATTR);
});

afterEach(() => {
  vi.useRealTimers();
  window.history.replaceState(null, "", "/");
});

describe("SESSION_CHECK_SCRIPT", () => {
  it("hides / and /login for a stored user", () => {
    window.localStorage.setItem("voyage-user", "{}");

    runScriptAt("/");
    expect(root().hasAttribute(SESSION_CHECK_ATTR)).toBe(true);

    root().removeAttribute(SESSION_CHECK_ATTR);
    runScriptAt("/login?mode=register");
    expect(root().hasAttribute(SESSION_CHECK_ATTR)).toBe(true);
  });

  it("never hides for visitors with no stored user", () => {
    runScriptAt("/");
    expect(root().hasAttribute(SESSION_CHECK_ATTR)).toBe(false);
  });

  it("leaves wizard steps, invitations and other pages alone", () => {
    window.localStorage.setItem("voyage-user", "{}");

    for (const url of ["/login?step=type", "/login?mode=register&invite=abc", "/share/abc"]) {
      runScriptAt(url);
      expect(root().hasAttribute(SESSION_CHECK_ATTR)).toBe(false);
    }
  });

  it("un-hides on its own if the app never settles", () => {
    vi.useFakeTimers();
    window.localStorage.setItem("voyage-user", "{}");

    runScriptAt("/");
    vi.advanceTimersByTime(5000);

    expect(root().hasAttribute(SESSION_CHECK_ATTR)).toBe(false);
  });
});

describe("helpers", () => {
  it("hasStoredUser reads the stored user", () => {
    expect(hasStoredUser()).toBe(false);
    window.localStorage.setItem("voyage-user", "{}");
    expect(hasStoredUser()).toBe(true);
  });

  it("endSessionCheck removes the attribute", () => {
    root().setAttribute(SESSION_CHECK_ATTR, "");
    endSessionCheck();
    expect(root().hasAttribute(SESSION_CHECK_ATTR)).toBe(false);
  });
});
