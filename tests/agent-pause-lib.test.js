import { describe, expect, it } from "vitest";
import {
  activeLearnedPause,
  activePause,
  describePause,
  learnedPauseEnd,
  pauseFromError,
  pauseKey,
  SERVER_PAUSE_HOLD_MS,
  shortUntil,
} from "../app/lib/agentPause.js";

const NOW = Date.parse("2026-10-25T08:00:00.000Z");

describe("agent pause helpers", () => {
  it("treats a pause past its end as over", () => {
    expect(activePause({ until: "2026-10-25T07:59:00.000Z", reason: "x", pausedAt: "p" }, NOW)).toBeNull();
    expect(activePause({ until: null, reason: "x", pausedAt: "p" }, NOW)).not.toBeNull();
    expect(activePause(null, NOW)).toBeNull();
  });

  it("describes the pause in a sentence, with its end in words", () => {
    expect(describePause({ until: null }, NOW)).toBe(
      "An administrator has paused your access to the agent. It stays paused until they lift it."
    );
    expect(describePause({ until: "2026-10-25T08:30:00.000Z" }, NOW)).toMatch(
      /^An administrator has paused your access to the agent until .+ \(in 30 minutes\)\.$/
    );
    expect(describePause({ until: "2026-10-26T07:00:00.000Z" }, NOW)).toMatch(/\(in 23 hours\)\.$/);
    expect(describePause({ until: "2026-11-01T08:00:00.000Z" }, NOW)).toMatch(/\(in 7 days\)\.$/);
  });

  it("uses singular units and never says 0 minutes", () => {
    expect(describePause({ until: "2026-10-25T08:01:00.000Z" }, NOW)).toMatch(/\(in 1 minute\)\.$/);
    expect(describePause({ until: "2026-10-25T08:00:10.000Z" }, NOW)).toMatch(/\(in 1 minute\)\.$/);
    expect(describePause({ until: "2026-10-25T09:00:00.000Z" }, NOW)).toMatch(/\(in 1 hour\)\.$/);
  });

  it("does not promise a future time for an end this device's clock has already passed", () => {
    expect(describePause({ until: "2026-10-25T07:50:00.000Z" }, NOW)).toMatch(/until .+ \(any moment now\)\.$/);
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

describe("a pause the server just enforced (AGENT_PAUSED)", () => {
  const learnedAt = NOW;

  it("runs to its own end when that is still ahead", () => {
    const pause = { pausedAt: "p", until: "2026-10-25T08:00:05.000Z", reason: "x" };
    expect(learnedPauseEnd(pause, learnedAt)).toBe(Date.parse(pause.until));
    expect(activeLearnedPause(pause, learnedAt, NOW + 4000)).toBe(pause);
    expect(activeLearnedPause(pause, learnedAt, NOW + 6000)).toBeNull();
  });

  it("is held for a short while when this device's clock already thinks it ended", () => {
    const pause = { pausedAt: "p", until: "2026-10-25T07:50:00.000Z", reason: "x" };
    expect(learnedPauseEnd(pause, learnedAt)).toBe(learnedAt + SERVER_PAUSE_HOLD_MS);
    expect(activeLearnedPause(pause, learnedAt, NOW + SERVER_PAUSE_HOLD_MS - 1)).toBe(pause);
    expect(activeLearnedPause(pause, learnedAt, NOW + SERVER_PAUSE_HOLD_MS + 1)).toBeNull();
  });

  it("has no end when an administrator has to lift it", () => {
    const pause = { pausedAt: "p", until: null, reason: "x" };
    expect(learnedPauseEnd(pause, learnedAt)).toBeNull();
    expect(activeLearnedPause(pause, learnedAt, NOW + 10 * 86400000)).toBe(pause);
    expect(activeLearnedPause(null, learnedAt, NOW)).toBeNull();
  });
});
