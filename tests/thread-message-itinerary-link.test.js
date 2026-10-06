import { describe, expect, it } from "vitest";
import { normalizeThreadMessages } from "../app/hooks/useTripPlanning.js";

// After a reload the chat shows the itinerary card on the replies the server links
// to the itinerary, the same replies the live run tagged. The text guess is only a
// fallback for servers that don't send the link yet.
describe("reloaded thread messages", () => {
  it("trusts the server's itinerary link over guessing from the reply text", () => {
    const messages = normalizeThreadMessages({
      itineraryId: "itinerary-1",
      messages: [
        { id: "user-1", role: "USER", content: "Plan Da Nang for a wheelchair user" },
        {
          id: "assistant-built",
          role: "ASSISTANT",
          itineraryId: "itinerary-1",
          content: "The 3-Day Da Nang Accessible Family Itinerary has been created.",
        },
        { id: "user-2", role: "USER", content: "What should they pack?" },
        { id: "assistant-chat", role: "ASSISTANT", content: "Day 1 - pack light layers for the coast." },
      ],
    });

    expect(messages.find((message) => message.id === "assistant-built")).toMatchObject({
      itineraryId: "itinerary-1",
    });
    expect(messages.find((message) => message.id === "assistant-chat")).not.toHaveProperty("itineraryId");
  });

  it("still guesses from the reply text when the server sends no link", () => {
    const messages = normalizeThreadMessages({
      itineraryId: "itinerary-1",
      messages: [
        { id: "user-1", role: "USER", content: "Plan Olongapo" },
        { id: "assistant-built", role: "ASSISTANT", content: "The itinerary draft has been created." },
      ],
    });

    expect(messages.find((message) => message.id === "assistant-built")).toMatchObject({
      itineraryId: "itinerary-1",
    });
  });
});
