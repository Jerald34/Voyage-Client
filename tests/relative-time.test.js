import { afterEach, describe, expect, it, vi } from "vitest";
import { timeAgo, timeAgoSpoken } from "../app/lib/relativeTime.js";

const NOW = Date.parse("2026-10-04T12:00:00.000Z");
const ago = (ms) => new Date(NOW - ms).toISOString();

afterEach(() => {
  vi.useRealTimers();
});

describe("timeAgo", () => {
  it.each([
    [20_000, "Just now"],
    [5 * 60_000, "5m ago"],
    [2 * 3_600_000, "2h ago"],
    [3 * 86_400_000, "3d ago"],
  ])("%i ms ago reads %s", (ms, text) => {
    expect(timeAgo(ago(ms), NOW)).toBe(text);
  });

  it("treats a time slightly in the future as just now", () => {
    expect(timeAgo(new Date(NOW + 30_000).toISOString(), NOW)).toBe("Just now");
  });

  it("returns an empty string for no date and the raw text for an unreadable one", () => {
    expect(timeAgo(null, NOW)).toBe("");
    expect(timeAgo("not a date", NOW)).toBe("not a date");
  });

  it("reads the current time when no `now` is given", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(timeAgo(ago(5 * 60_000))).toBe("5m ago");
  });
});

describe("timeAgoSpoken", () => {
  it.each([
    [20_000, "just now"],
    [60_000, "1 minute ago"],
    [5 * 60_000, "5 minutes ago"],
    [3_600_000, "1 hour ago"],
    [2 * 3_600_000, "2 hours ago"],
    [86_400_000, "1 day ago"],
    [3 * 86_400_000, "3 days ago"],
  ])("%i ms ago reads %s", (ms, text) => {
    expect(timeAgoSpoken(ago(ms), NOW)).toBe(text);
  });

  it("reads the current time when no `now` is given", () => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    expect(timeAgoSpoken(ago(5 * 60_000))).toBe("5 minutes ago");
  });
});
