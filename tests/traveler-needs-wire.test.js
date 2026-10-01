import { beforeEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ fetchApi: vi.fn(async () => ({ runId: "run-1" })) }));

vi.mock("../app/lib/api/client.js", async (importOriginal) => ({
  ...(await importOriginal()),
  fetchApi: client.fetchApi,
}));

import { sendMessage } from "../app/lib/api/agent.js";

const bodyOf = () => JSON.parse(client.fetchApi.mock.calls[0][1].body);

beforeEach(() => {
  client.fetchApi.mockClear();
});

describe("sendMessage traveler needs wire contract", () => {
  it("omits travelerNeeds when none were chosen, so the server leaves the thread unchanged", async () => {
    await sendMessage("agency-1", "thread-1", "Plan Cebu", [], null);

    expect(client.fetchApi).toHaveBeenCalledWith(
      "/agencies/agency-1/agent/threads/thread-1/messages",
      expect.objectContaining({ method: "POST" }),
    );
    expect(bodyOf()).toEqual({ content: "Plan Cebu" });
    expect("travelerNeeds" in bodyOf()).toBe(false);
  });

  it("sends an explicit empty selection so the server clears the thread's needs", async () => {
    await sendMessage("agency-1", "thread-1", "Plan Cebu", [], { needs: [], notes: null });

    expect(bodyOf()).toEqual({ content: "Plan Cebu", travelerNeeds: { needs: [], notes: null } });
  });

  it("sends a populated selection alongside image urls", async () => {
    const needs = { needs: ["WHEELCHAIR"], notes: "Uses a cane" };
    await sendMessage("agency-1", "thread-1", "Plan Cebu", ["https://img/1.png"], needs);

    expect(bodyOf()).toEqual({ content: "Plan Cebu", imageUrls: ["https://img/1.png"], travelerNeeds: needs });
  });
});
