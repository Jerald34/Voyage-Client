import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { useAgentRunStream } from "../app/hooks/useAgentRunStream.js";

// Mock EventSource
class MockEventSource {
  constructor(url, options) {
    this.url = url;
    this.options = options;
    this.listeners = {};
    this.closed = false;
  }

  addEventListener(type, handler) {
    if (!this.listeners[type]) {
      this.listeners[type] = [];
    }
    this.listeners[type].push(handler);
  }

  removeEventListener(type, handler) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(h => h !== handler);
    }
  }

  emit(type, data) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(handler => {
        handler({ data: JSON.stringify(data) });
      });
    }
  }

  close() {
    this.closed = true;
  }
}

// Global mock for EventSource
let mockEventSourceInstance;
global.EventSource = class extends MockEventSource {
  constructor(url, options) {
    super(url, options);
    mockEventSourceInstance = this;
  }
};

describe("useAgentRunStream — task.updated events", () => {
  beforeEach(() => {
    mockEventSourceInstance = null;
  });

  afterEach(() => {
    // Clean up any active streams
    if (mockEventSourceInstance && !mockEventSourceInstance.closed) {
      mockEventSourceInstance.close();
    }
  });

  it("two task.updated events with same id produce one task row; second event fields win", () => {
    const { result } = renderHook(() => useAgentRunStream("agency-1"));

    act(() => {
      result.current.startStream("run-123");
    });

    // First event
    act(() => {
      mockEventSourceInstance.emit("task.updated", {
        type: "task.updated",
        payload: {
          id: "task-1",
          label: "First label",
          status: "PENDING",
          sortOrder: 1,
        },
      });
    });

    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe("task-1");
    expect(result.current.tasks[0].label).toBe("First label");
    expect(result.current.tasks[0].status).toBe("PENDING");

    // Second event with same id, different fields
    act(() => {
      mockEventSourceInstance.emit("task.updated", {
        type: "task.updated",
        payload: {
          id: "task-1",
          label: "Updated label",
          status: "RUNNING",
          sortOrder: 1,
        },
      });
    });

    // Still one task, but fields updated
    expect(result.current.tasks).toHaveLength(1);
    expect(result.current.tasks[0].id).toBe("task-1");
    expect(result.current.tasks[0].label).toBe("Updated label");
    expect(result.current.tasks[0].status).toBe("RUNNING");
  });

  it("task.updated event without id field is ignored", () => {
    const { result } = renderHook(() => useAgentRunStream("agency-1"));

    act(() => {
      result.current.startStream("run-456");
    });

    // Event without id
    act(() => {
      mockEventSourceInstance.emit("task.updated", {
        type: "task.updated",
        payload: {
          label: "Orphaned task",
          status: "PENDING",
        },
      });
    });

    expect(result.current.tasks).toHaveLength(0);
  });

  it("tasksTouchedThisRun Set contains task id after one task.updated event", () => {
    const { result } = renderHook(() => useAgentRunStream("agency-1"));

    act(() => {
      result.current.startStream("run-789");
    });

    act(() => {
      mockEventSourceInstance.emit("task.updated", {
        type: "task.updated",
        payload: {
          id: "task-touch-1",
          label: "Touched task",
          status: "PENDING",
        },
      });
    });

    expect(result.current.tasksTouchedThisRun).toBeDefined();
    expect(result.current.tasksTouchedThisRun.has("task-touch-1")).toBe(true);
  });

  it("calling startStream again resets tasksTouchedThisRun to empty Set", () => {
    const { result } = renderHook(() => useAgentRunStream("agency-1"));

    // First stream
    act(() => {
      result.current.startStream("run-first");
    });

    act(() => {
      mockEventSourceInstance.emit("task.updated", {
        type: "task.updated",
        payload: { id: "task-a", label: "Task A", status: "PENDING" },
      });
    });

    expect(result.current.tasksTouchedThisRun.has("task-a")).toBe(true);

    // Start a second stream
    act(() => {
      result.current.startStream("run-second");
    });

    // The Set should be reset
    expect(result.current.tasksTouchedThisRun.size).toBe(0);
    expect(result.current.tasksTouchedThisRun.has("task-a")).toBe(false);

    // New task in new stream should be tracked
    act(() => {
      mockEventSourceInstance.emit("task.updated", {
        type: "task.updated",
        payload: { id: "task-b", label: "Task B", status: "RUNNING" },
      });
    });

    expect(result.current.tasksTouchedThisRun.has("task-b")).toBe(true);
    expect(result.current.tasksTouchedThisRun.has("task-a")).toBe(false);
  });

  it("two task.updated events with different ids produce two tasks", () => {
    const { result } = renderHook(() => useAgentRunStream("agency-1"));

    act(() => {
      result.current.startStream("run-multi");
    });

    // First task
    act(() => {
      mockEventSourceInstance.emit("task.updated", {
        type: "task.updated",
        payload: {
          id: "task-x",
          label: "Task X",
          status: "PENDING",
        },
      });
    });

    // Second task
    act(() => {
      mockEventSourceInstance.emit("task.updated", {
        type: "task.updated",
        payload: {
          id: "task-y",
          label: "Task Y",
          status: "RUNNING",
        },
      });
    });

    expect(result.current.tasks).toHaveLength(2);
    expect(result.current.tasks[0].id).toBe("task-x");
    expect(result.current.tasks[1].id).toBe("task-y");
    expect(result.current.tasksTouchedThisRun.has("task-x")).toBe(true);
    expect(result.current.tasksTouchedThisRun.has("task-y")).toBe(true);
  });
});

describe("useAgentRunStream — ask_user replies", () => {
  it("keeps the reply's server id and questions from message.completed, and clears them on the next run", () => {
    const { result } = renderHook(() => useAgentRunStream("agency-1"));
    const askUser = {
      questions: [{ id: "q1", header: "Transport", question: "Car or train?", multiSelect: false, options: [{ label: "Car" }, { label: "Train" }] }],
    };

    act(() => {
      result.current.startStream("run-1");
    });
    act(() => {
      mockEventSourceInstance.emit("message.completed", {
        type: "message.completed",
        payload: { messageId: "message-9", content: "One question first.", askUser },
      });
    });

    expect(result.current.completedMessageId).toBe("message-9");
    expect(result.current.completedMessageAskUser).toEqual(askUser);

    act(() => {
      result.current.startStream("run-2");
    });

    expect(result.current.completedMessageId).toBeNull();
    expect(result.current.completedMessageAskUser).toBeNull();
  });
});
