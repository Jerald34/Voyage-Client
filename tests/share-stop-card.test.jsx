import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

// components/icons/index.js contains JSX in a .js file, which vitest cannot parse.
vi.mock("../app/components/icons/index.js", () => ({ MapPinIcon: () => null, ChatIcon: () => null }));

import ShareStopCard from "../app/itinerary/view/[token]/components/ShareStopCard.jsx";

const item = {
  id: "item-1",
  title: "Kiyomizu-dera",
  description: "Arrive early for the wooden stage.",
  clientNotes: "Wear comfy shoes.",
  placeSnapshot: {
    name: "Kiyomizu-dera",
    formattedAddress: "1 Chome-294 Kiyomizu, Kyoto",
    rating: 4.6,
    metadata: { googleTypes: ["buddhist_temple"], primaryPhotoUrl: "https://photos.example/kiyomizu.jpg" },
  },
};

describe("ShareStopCard", () => {
  it("shows the stop the way the in-app itinerary does", () => {
    render(<ShareStopCard item={item} timeLabel="8:00 AM – 10:00 AM" icon={<span>icon</span>} />);

    expect(screen.getByText("8:00 AM – 10:00 AM")).toBeInTheDocument();
    expect(screen.getByText("Buddhist Temple")).toBeInTheDocument();
    expect(screen.getByText("★ 4.6")).toBeInTheDocument();
    expect(screen.getByText("1 Chome-294 Kiyomizu, Kyoto")).toBeInTheDocument();
    expect(screen.getByText("Wear comfy shoes.")).toBeInTheDocument();
    expect(document.querySelector("img")).toHaveAttribute("src", "https://photos.example/kiyomizu.jpg");
  });

  it("uses the stop type icon when there is no photo", () => {
    const noPhoto = { ...item, placeSnapshot: { ...item.placeSnapshot, metadata: {} } };
    render(<ShareStopCard item={noPhoto} icon={<span>type icon</span>} />);

    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("type icon")).toBeInTheDocument();
  });

  it("sets the title in the dashboard's sans, never a faked serif bold (Design decision 6)", () => {
    render(<ShareStopCard item={item} />);
    const title = screen.getByRole("heading", { level: 3, name: "Kiyomizu-dera" });

    expect(title.className).toContain("font-sans");
    expect(title.className).toContain("font-semibold");
    expect(title.className).not.toContain("font-serif");
  });

  it("marks the stop the map is pointing at and renders its actions and comments", () => {
    render(
      <ShareStopCard item={item} isActive actions={<button type="button">Comment</button>}>
        <p>A comment</p>
      </ShareStopCard>,
    );

    expect(screen.getByRole("article")).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("button", { name: "Comment" })).toBeInTheDocument();
    expect(screen.getByText("A comment")).toBeInTheDocument();
  });

  it("numbers the stop in its day's colour, matching its map pin", () => {
    render(<ShareStopCard item={item} dayNumber={2} stopNumber={3} timeLabel="8:00 AM" />);

    expect(screen.getByText("Stop 3")).toHaveClass("sr-only");
    expect(screen.getByText("3").parentElement).toHaveStyle({ backgroundColor: "#0F766E" });
  });

  it("shows the active stop by border and shadow, keeping the elevated background so the time pill stays readable", () => {
    render(<ShareStopCard item={item} isActive timeLabel="8:00 AM" />);
    const card = screen.getByRole("article");

    expect(card.className).toContain("bg-surface-elevated");
    expect(card.className).toContain("border-secondary/40");
    expect(card.className).toContain("shadow-soft");
    expect(card.className).not.toMatch(/\bbg-secondary\/5\b/);
  });

  describe("keyboard parity with hover", () => {
    function renderWithTwoButtons(onHoverChange) {
      render(
        <div>
          <ShareStopCard
            item={item}
            onHoverChange={onHoverChange}
            actions={
              <>
                <button type="button">Map pin</button>
                <button type="button">Comment</button>
              </>
            }
          />
          <button type="button">Outside</button>
        </div>,
      );
    }

    it("highlights the stop on the map when focus enters the card", () => {
      const onHoverChange = vi.fn();
      renderWithTwoButtons(onHoverChange);

      fireEvent.focus(screen.getByRole("button", { name: "Map pin" }));

      expect(onHoverChange).toHaveBeenCalledWith(true);
    });

    it("keeps the highlight while focus moves between controls inside the card", () => {
      const onHoverChange = vi.fn();
      renderWithTwoButtons(onHoverChange);
      const mapPin = screen.getByRole("button", { name: "Map pin" });
      const comment = screen.getByRole("button", { name: "Comment" });

      fireEvent.focus(mapPin);
      onHoverChange.mockClear();
      fireEvent.blur(mapPin, { relatedTarget: comment });

      expect(onHoverChange).not.toHaveBeenCalled();
    });

    it("drops the highlight when focus leaves the card", () => {
      const onHoverChange = vi.fn();
      renderWithTwoButtons(onHoverChange);
      const mapPin = screen.getByRole("button", { name: "Map pin" });

      fireEvent.focus(mapPin);
      fireEvent.blur(mapPin, { relatedTarget: screen.getByRole("button", { name: "Outside" }) });

      expect(onHoverChange).toHaveBeenLastCalledWith(false);
    });

    it("drops the highlight when focus leaves the page entirely (no related target)", () => {
      const onHoverChange = vi.fn();
      renderWithTwoButtons(onHoverChange);
      const mapPin = screen.getByRole("button", { name: "Map pin" });

      fireEvent.focus(mapPin);
      fireEvent.blur(mapPin, { relatedTarget: null });

      expect(onHoverChange).toHaveBeenLastCalledWith(false);
    });
  });
});
