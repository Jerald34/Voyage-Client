import { describe, expect, it } from "vitest";
import { getRunStatusLabel } from "../app/lib/formatters.js";

describe("getRunStatusLabel", () => {
  it('says "Working" while a run is in progress', () => {
    expect(getRunStatusLabel("running", null)).toBe("Working");
    expect(getRunStatusLabel("in_progress", null)).toBe("Working");
  });

  it("keeps the idle, ready and error labels", () => {
    expect(getRunStatusLabel("completed", null)).toBe("Idle");
    expect(getRunStatusLabel("idle", null)).toBe("Ready");
    expect(getRunStatusLabel("running", new Error("stream failed"))).toBe("Needs attention");
  });
});
