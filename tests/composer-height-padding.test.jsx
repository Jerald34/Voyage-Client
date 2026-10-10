import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useElementHeight from "../app/hooks/useElementHeight.js";
import AgentCommandCenter from "../app/components/trip-dashboard/command-center/AgentCommandCenter.jsx";
import MobileGlassSheet from "../app/components/trip-dashboard/mobile/MobileGlassSheet.jsx";

// jsdom has no ResizeObserver; this one lets a test report a new size.
let observers = [];
class FakeResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.targets = [];
    observers.push(this);
  }
  observe(target) {
    this.targets.push(target);
  }
  disconnect() {
    this.targets = [];
  }
}

function resizeAll(height) {
  act(() => {
    for (const observer of observers) {
      observer.callback(observer.targets.map((target) => ({ target, contentRect: { height } })));
    }
  });
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal("ResizeObserver", FakeResizeObserver);
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function Probe() {
  const [ref, height] = useElementHeight();
  return (
    <div ref={ref} data-testid="probe">
      {height}
    </div>
  );
}

describe("useElementHeight", () => {
  it("reports the observed element's height", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("0");

    resizeAll(312);

    expect(screen.getByTestId("probe")).toHaveTextContent("312");
  });

  it("stays at 0 without ResizeObserver", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveTextContent("0");
  });
});

function renderCenter() {
  return render(
    <AgentCommandCenter
      messages={[{ id: "m-1", role: "assistant", content: "A couple of details first." }]}
      isStreaming={false}
      assistantMessage=""
      toolCalls={[]}
      thoughtEntries={[]}
      dispatchAgentMessage={vi.fn()}
      dispatchAgentAnswer={vi.fn()}
      composerInput=""
      setComposerInput={vi.fn()}
      isSending={false}
      agentError=""
      user={{ displayName: "Jerald" }}
    />,
  );
}

describe("the chat log makes room for the composer", () => {
  it("keeps the old 120px room for the plain text box", () => {
    renderCenter();
    expect(screen.getByTestId("chat-log").style.paddingBottom).toBe("120px");
  });

  it("grows its bottom room when the composer turns into the taller question panel", () => {
    renderCenter();

    resizeAll(480);

    expect(screen.getByTestId("chat-log").style.paddingBottom).toBe("504px");
  });
});

describe("the mobile sheet makes room for its footer", () => {
  it("grows its bottom room with the footer", () => {
    // The sheet renders only at phone width.
    vi.stubGlobal("matchMedia", (query) => ({
      matches: true,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    render(
      <MobileGlassSheet footer={<div>composer</div>}>
        <p>chat</p>
      </MobileGlassSheet>,
    );
    const content = screen.getByText("chat").parentElement;
    expect(content.style.paddingBottom).toBe("104px");

    resizeAll(420);

    expect(content.style.paddingBottom).toBe("428px");
  });
});
