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

// The label shows twice: the visible header and the sr-only aria-live region.
// Other polite regions exist, so pick the atomic one.
function expectLabel(label) {
  expect(screen.getAllByText(label)).toHaveLength(2);
  const live = document.querySelector('[aria-live="polite"][aria-atomic="true"]');
  expect(live.textContent).toBe(label);
}

describe("live agent status label", () => {
  it("says it is reading the request before anything happens", () => {
    renderLive();
    expectLabel("Reading your request…");
  });

  it("names the running tool in plain words", () => {
    renderLive({ toolCalls: [{ name: "search_google_places", status: "Running" }] });
    expectLabel("Searching for places…");
  });

  it("says it is choosing the next step while it reasons", () => {
    renderLive({
      toolCalls: [{ name: "search_google_places", status: "Completed" }],
      thoughtEntries: [{ id: "th-1", text: "Burnham Park first", precedingToolCount: 1 }],
    });
    expectLabel("Choosing the next step…");
  });

  it("says it is writing once the reply text streams in", () => {
    renderLive({ toolCalls: [{ name: "add_itinerary_item", status: "Completed" }], assistantMessage: "Here is your plan" });
    expectLabel("Writing the reply…");
    expect(screen.queryByText("Adding a stop…")).not.toBeInTheDocument();
  });

  it("never says Thinking", () => {
    renderLive();
    expect(screen.queryByText(/thinking/i)).not.toBeInTheDocument();
  });
});
