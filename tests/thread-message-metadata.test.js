import { describe, expect, it } from "vitest";
import { normalizeThreadMessages } from "../app/hooks/useTripPlanning.js";

describe("reloaded message metadata", () => {
  it("keeps questions, answers, and image urls", () => {
    const askUser = {
      questions: [{ id: "q1", header: "Transport", question: "Car or train?", multiSelect: false, options: [{ label: "Car" }, { label: "Train" }] }],
    };
    const answers = { messageId: "a-1", items: [{ questionId: "q1", header: "Transport", question: "Car or train?", selected: ["Train"] }] };

    const messages = normalizeThreadMessages({
      messages: [
        { id: "u-1", role: "USER", content: "What is this?", metadata: { imageUrls: ["https://img/1.png"] } },
        { id: "a-1", role: "ASSISTANT", content: "One question first.", metadata: { askUser } },
        { id: "u-2", role: "USER", content: "Transport: Train", metadata: { answers } },
      ],
    });

    expect(messages[0].metadata).toEqual({ imageUrls: ["https://img/1.png"] });
    expect(messages[1].metadata).toEqual({ askUser });
    expect(messages[2].metadata).toEqual({ answers });
  });
});
