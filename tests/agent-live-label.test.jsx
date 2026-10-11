import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AgentCommandCenter from "../app/components/trip-dashboard/command-center/AgentCommandCenter.jsx";

// jsdom has no ResizeObserver (useElementHeight) and no scrollIntoView.
class FakeResizeObserver {
  observe() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderLive({ assistantMessage = "", toolCalls = [], thoughtEntries = [] } = {}) {
  return render(
    <AgentCommandCenter
      messages={[{ id: "u-1", role: "user", content: "Plan two days in Baguio" }]}
      isStreaming
      assistantMessage={assistantMessage}
      toolCalls={toolCalls}
      thoughtEntries={thoughtEntries}
      dispatchAgentMessage={vi.fn()}
      composerInput=""
      setComposerInput={vi.fn()}
      isSending={false}
      agentError=""
      user={{ displayName: "Jerald" }}
    />,
  );
}

// The header label also lives in an sr-only aria-live region, so it appears twice.
describe("live agent status label", () => {
  it("says it is reading the request before anything happens", () => {
    renderLive();
    expect(screen.getAllByText("Reading your request…").length).toBeGreaterThan(0);
  });

  it("names the running tool in plain words", () => {
    renderLive({ toolCalls: [{ name: "search_google_places", status: "Running" }] });
    expect(screen.getAllByText("Searching for places…").length).toBeGreaterThan(0);
  });

  it("says it is choosing the next step while it reasons", () => {
    renderLive({
      toolCalls: [{ name: "search_google_places", status: "Completed" }],
      thoughtEntries: [{ id: "th-1", text: "Burnham Park first", precedingToolCount: 1 }],
    });
    expect(screen.getAllByText("Choosing the next step…").length).toBeGreaterThan(0);
  });

  it("says it is writing once the reply text streams in", () => {
    renderLive({ toolCalls: [{ name: "add_itinerary_item", status: "Completed" }], assistantMessage: "Here is your plan" });
    expect(screen.getAllByText("Writing the reply…").length).toBeGreaterThan(0);
  });

  it("never says Thinking", () => {
    renderLive();
    expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument();
  });
});
