import { describe, expect, it } from "vitest";
import {
  answerText,
  askUserStatuses,
  buildAnswer,
  emptyDraft,
  findPendingQuestion,
  getAnswers,
  getAskUser,
  isAnswered,
} from "../app/lib/agent/askUser.js";

const questions = [
  { id: "q1", header: "Transport", question: "How will the travelers get around?", multiSelect: false, options: [{ label: "Private car" }, { label: "Public transit" }] },
  { id: "q2", header: "Interests", question: "What should the days focus on?", multiSelect: true, options: [{ label: "Food" }, { label: "Museums" }] },
];
const asking = { id: "m-2", role: "assistant", content: "A couple of details first.", metadata: { askUser: { questions } } };
const answer = {
  id: "m-3",
  role: "user",
  content: "Transport: Public transit",
  metadata: { answers: { messageId: "m-2", items: [{ questionId: "q1", header: "Transport", selected: ["Public transit"] }] } },
};

describe("findPendingQuestion", () => {
  it("returns the questions while the asking reply is the newest message", () => {
    expect(findPendingQuestion([{ id: "m-1", role: "user", content: "Plan Kyoto" }, asking])).toEqual({ messageId: "m-2", questions });
  });

  it("closes once any later chat message exists", () => {
    expect(findPendingQuestion([asking, answer])).toBeNull();
    expect(findPendingQuestion([asking, { id: "m-4", role: "user", content: "Actually, plan Osaka" }])).toBeNull();
  });

  it("ignores system notes after the question", () => {
    expect(findPendingQuestion([asking, { id: "s-1", role: "system", content: "Reused 3 stops" }])).toEqual({ messageId: "m-2", questions });
  });

  it("returns null for replies without questions", () => {
    expect(findPendingQuestion([{ id: "m-1", role: "assistant", content: "Done." }])).toBeNull();
    expect(findPendingQuestion(undefined)).toBeNull();
  });
});

describe("askUserStatuses", () => {
  it("marks each asking reply pending, answered, or skipped", () => {
    const statuses = askUserStatuses([
      asking,
      answer,
      { ...asking, id: "m-5" },
      { id: "m-6", role: "user", content: "Never mind" },
      { ...asking, id: "m-7" },
    ]);

    expect(statuses.get("m-2")).toBe("answered");
    expect(statuses.get("m-5")).toBe("skipped");
    expect(statuses.get("m-7")).toBe("pending");
  });
});

describe("buildAnswer", () => {
  it("builds the API request, the bubble display, and the text the agent reads", () => {
    const draft = {
      ...emptyDraft(questions),
      q1: { selected: ["Public transit"], other: "" },
      q2: { selected: ["Food"], other: " Night markets " },
    };

    const result = buildAnswer({ messageId: "m-2", questions }, draft);

    expect(result.request).toEqual({
      messageId: "m-2",
      items: [
        { questionId: "q1", selected: ["Public transit"] },
        { questionId: "q2", selected: ["Food"], other: "Night markets" },
      ],
    });
    expect(result.display.items[1]).toMatchObject({ header: "Interests", question: "What should the days focus on?" });
    expect(result.text).toBe("Transport: Public transit\nInterests: Food, Night markets");
  });
});

describe("small helpers", () => {
  it("reads questions and answers only from the right roles", () => {
    expect(getAskUser(asking)).toBe(questions);
    expect(getAskUser({ ...asking, role: "user" })).toBeNull();
    expect(getAnswers(answer)).toBe(answer.metadata.answers);
    expect(getAnswers({ ...answer, role: "assistant" })).toBeNull();
  });

  it("treats a choice or typed text as an answer", () => {
    expect(isAnswered({ selected: [], other: "  " })).toBe(false);
    expect(isAnswered({ selected: ["Food"], other: "" })).toBe(true);
    expect(isAnswered({ selected: [], other: "Bike" })).toBe(true);
    expect(answerText({ selected: ["Food", "Museums"], other: "Night markets" })).toBe("Food, Museums, Night markets");
  });
});
