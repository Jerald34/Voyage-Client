import { describe, expect, it } from "vitest";
import { activePause, describeUntil, pauseFromError, pauseKey, shortUntil } from "../app/lib/agentPause.js";

const NOW = Date.parse("2026-10-25T08:00:00.000Z");

describe("agent pause helpers", () => {
  it("treats a pause past its end as over", () => {
    expect(activePause({ until: "2026-10-25T07:59:00.000Z", reason: "x", pausedAt: "p" }, NOW)).toBeNull();
    expect(activePause({ until: null, reason: "x", pausedAt: "p" }, NOW)).not.toBeNull();
    expect(activePause(null, NOW)).toBeNull();
  });

  it("describes the end in words", () => {
    expect(describeUntil({ until: null }, NOW)).toBe("until an administrator lifts it");
    expect(describeUntil({ until: "2026-10-25T08:30:00.000Z" }, NOW)).toMatch(/^until .+ \(in 30 minutes\)$/);
    expect(describeUntil({ until: "2026-10-26T07:00:00.000Z" }, NOW)).toMatch(/\(in 23 hours\)$/);
    expect(describeUntil({ until: "2026-11-01T08:00:00.000Z" }, NOW)).toMatch(/\(in 7 days\)$/);
  });

  it("uses singular units and never says 0 minutes", () => {
    expect(describeUntil({ until: "2026-10-25T08:01:00.000Z" }, NOW)).toMatch(/\(in 1 minute\)$/);
    expect(describeUntil({ until: "2026-10-25T08:00:10.000Z" }, NOW)).toMatch(/\(in 1 minute\)$/);
    expect(describeUntil({ until: "2026-10-25T09:00:00.000Z" }, NOW)).toMatch(/\(in 1 hour\)$/);
  });

  it("gives a short end for badges and the composer strip", () => {
    expect(shortUntil({ until: null })).toBe("Agent paused");
    expect(shortUntil({ until: "2026-10-26T07:00:00.000Z" })).toMatch(/^Agent paused until /);
  });

  it("reads a pause out of an AGENT_PAUSED API error", () => {
    const err = Object.assign(new Error("m"), { code: "AGENT_PAUSED", details: { until: null, reason: "Abuse", pausedAt: "p" } });
    expect(pauseFromError(err)).toEqual({ until: null, reason: "Abuse", pausedAt: "p" });
    expect(pauseFromError(Object.assign(new Error("m"), { code: "OTHER" }))).toBeNull();
  });

  it("copes with an AGENT_PAUSED error that carries no details", () => {
    const bare = Object.assign(new Error("m"), { code: "AGENT_PAUSED" });
    expect(pauseFromError(bare)).toEqual({ until: null, reason: "", pausedAt: null });
    expect(pauseFromError(null)).toBeNull();
  });

  it("keys a pause by when it started and when it ends", () => {
    expect(pauseKey(null)).toBe("");
    expect(pauseKey({ pausedAt: "a", until: null })).not.toBe(pauseKey({ pausedAt: "b", until: null }));
  });
});
