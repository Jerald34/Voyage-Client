import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

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
});
