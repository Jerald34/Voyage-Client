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

describe("sendMessage answers", () => {
  it("sends answers with the message", async () => {
    const answers = { messageId: "m-2", items: [{ questionId: "q1", selected: ["Train"] }] };

    await sendMessage("agency-1", "thread-1", "Transport: Train", [], null, answers);

    expect(bodyOf()).toEqual({ content: "Transport: Train", answers });
  });

  it("leaves answers out of an ordinary message", async () => {
    await sendMessage("agency-1", "thread-1", "Plan Cebu");

    expect(bodyOf()).toEqual({ content: "Plan Cebu" });
  });
});
