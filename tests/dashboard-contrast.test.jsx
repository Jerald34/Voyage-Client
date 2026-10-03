import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import HeroContinueCard from "../app/agency/[agencyId]/components/dashboard/widgets/HeroContinueCard.jsx";
import MyWorkColumn from "../app/agency/[agencyId]/components/dashboard/widgets/MyWorkColumn.jsx";
import PeriodSwitcher from "../app/agency/[agencyId]/components/dashboard/widgets/PeriodSwitcher.jsx";

const trip = (statusChip, tripId = statusChip) => ({
  tripId,
  tripTitle: `Trip ${statusChip}`,
  clientName: "Reyes",
  statusChip,
  updatedAt: new Date().toISOString(),
  lastActivityPreview: null,
});

/** A declaration (e.g. `color`, `background-color`) read from an element's inline style attribute. */
const styleValue = (element, property) =>
  new RegExp(`(?:^|;\\s*)${property}:\\s*([^;]+)`).exec(element.getAttribute("style") ?? "")?.[1].trim();
const chipColor = (element) => styleValue(element, "color");
const chipDot = (chip) => chip.querySelector('[aria-hidden="true"]');

// ---- Numeric WCAG contrast, resolved from the real tokens in globals.css ----

const css = readFileSync(resolvePath(__dirname, "../app/globals.css"), "utf8");

/** The declarations inside the first `<selector> { ... }` block of globals.css. */
function declarations(selector) {
  const open = css.indexOf(`${selector} {`) + selector.length + 2;
  let depth = 1;
  let end = open;
  while (depth > 0) {
    if (css[end] === "{") depth += 1;
    if (css[end] === "}") depth -= 1;
    end += 1;
  }
  return Object.fromEntries([...css.slice(open, end).matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

const LIGHT_TOKENS = { ...declarations("@theme"), ...declarations(":root") };
const THEMES = { light: LIGHT_TOKENS, dark: { ...LIGHT_TOKENS, ...declarations(".dark") } };

/** A CSS colour expression -> [r, g, b, a]. Handles the forms the chips use. */
function resolve(expression, tokens) {
  const value = expression.trim();
  const mix = /^color-mix\(in srgb,\s*(.+?)\s+(\d+)%,\s*transparent\)$/.exec(value);
  if (mix) {
    const [r, g, b, a] = resolve(mix[1], tokens);
    return [r, g, b, a * (Number(mix[2]) / 100)];
  }
  const single = /^var\((--[\w-]+)\)$/.exec(value);
  if (single) return resolve(tokens[single[1]], tokens);
  if (value.startsWith("#")) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(value.slice(i, i + 2), 16));
    return [r, g, b, 1];
  }
  const substituted = value.replace(/var\((--[\w-]+)\)/g, (_, name) => tokens[name]);
  const [channels, alpha] = substituted.replace(/^rgba?\(|\)$/g, "").split("/");
  const numbers = channels.split(/[\s,]+/).filter(Boolean).map(Number);
  return [numbers[0], numbers[1], numbers[2], alpha !== undefined ? Number(alpha) : (numbers[3] ?? 1)];
}

const over = ([r, g, b, a], [br, bg, bb]) => [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)];

function luminance([r, g, b]) {
  const [lr, lg, lb] = [r, g, b].map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(foreground, background) {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * What a chip sits on: the page background, the frame panel, the column's tile
 * and the row/card's own tile. A hovered row (`hover:bg-text-primary/5`) adds
 * 5% of the body-text colour on top.
 */
function surfaceUnderChip(theme, { hover }) {
  const tokens = THEMES[theme];
  let surface = resolve(`rgb(${tokens["--color-background-rgb"]})`, tokens).slice(0, 3);
  for (const layer of ["--frame-panel", "--frame-tile", "--frame-tile"]) surface = over(resolve(tokens[layer], tokens), surface);
  if (hover) {
    const [r, g, b] = resolve("rgb(var(--color-text-rgb))", tokens);
    surface = over([r, g, b, 0.05], surface);
  }
  return surface;
}

/** Contrast of a rendered chip's label against its own tint over `surface`. */
function chipContrast(chip, theme, surface) {
  const tokens = THEMES[theme];
  const tint = over(resolve(styleValue(chip, "background-color"), tokens), surface);
  return contrastRatio(resolve(chipColor(chip), tokens), tint);
}

const STATUSES = [
  ["DRAFT", "Draft"],
  ["IN_REVIEW", "In review"],
  ["APPROVED_INTERNAL", "Approved"],
  ["ARCHIVED", "Archived"],
];

describe("PeriodSwitcher contrast", () => {
  it("uses the strong accent pair for the selected period, readable in light and dark", () => {
    render(<PeriodSwitcher value="30d" onChange={() => {}} />);

    const active = screen.getByRole("radio", { name: "30d" });
    expect(active.className).toContain("bg-secondary-strong");
    expect(active.className).toContain("text-on-secondary-strong");
    expect(active.className).not.toMatch(/bg-secondary(?!-)/);
    expect(active.className).not.toContain("text-white");
  });

  it("transitions only the colours it changes", () => {
    render(<PeriodSwitcher value="30d" onChange={() => {}} />);

    const { className } = screen.getByRole("radio", { name: "7d" });
    expect(className).toContain("transition-[background-color,color]");
    expect(className).not.toContain("transition-all");
  });
});

describe("MyWorkColumn status chips", () => {
  function renderChips(statuses) {
    render(<MyWorkColumn hero={null} recent={statuses.map((status) => trip(status))} pipeline={null} agencyId="a1" onOpenTrip={() => {}} />);
  }

  it("is at least 12px", () => {
    renderChips(["DRAFT", "IN_REVIEW", "APPROVED_INTERNAL"]);

    for (const label of ["Draft", "In review", "Approved"]) {
      expect(screen.getByText(label).className).toContain("text-[12px]");
      expect(screen.getByText(label).className).not.toContain("text-[11px]");
    }
  });

  it("reads in the body colour, with the tint and dot carrying the status", () => {
    renderChips(["DRAFT", "IN_REVIEW", "APPROVED_INTERNAL"]);

    // Coloured text on a 12% tint of itself sits at ~4.5:1 at rest and dips
    // below it once the row is hovered, so the label uses the body colour.
    for (const label of ["Draft", "In review", "Approved"]) {
      expect(chipColor(screen.getByText(label))).toBe("rgb(var(--color-text-rgb))");
    }
    expect(styleValue(chipDot(screen.getByText("Draft")), "background-color")).toBe("var(--warning)");
    expect(styleValue(chipDot(screen.getByText("In review")), "background-color")).toBe("var(--accent)");
    expect(styleValue(chipDot(screen.getByText("Approved")), "background-color")).toBe("var(--success)");
  });

  it("keeps the archived chip in the muted colour", () => {
    renderChips(["ARCHIVED"]);

    expect(chipColor(screen.getByText("Archived"))).toBe("rgb(var(--color-text-muted-rgb))");
  });

  describe.each(["light", "dark"])("%s theme", (theme) => {
    it.each([
      ["at rest", false],
      ["while the row is hovered", true],
    ])("every chip label reaches 4.5:1 %s", (_, hover) => {
      const surface = surfaceUnderChip(theme, { hover });

      for (const [status, label] of STATUSES) {
        const { unmount } = render(
          <MyWorkColumn hero={null} recent={[trip(status)]} pipeline={null} agencyId="a1" onOpenTrip={() => {}} />,
        );
        expect(chipContrast(screen.getByText(label), theme, surface), `${label} chip, ${theme}`).toBeGreaterThanOrEqual(4.5);
        unmount();
      }
    });
  });
});

describe("HeroContinueCard status chip", () => {
  it("is at least 12px", () => {
    render(<HeroContinueCard trip={trip("IN_REVIEW")} onContinue={() => {}} />);

    const chip = screen.getByText("In review");
    expect(chip.className).toContain("text-[12px]");
    expect(chip.className).not.toContain("text-[0.7rem]");
  });

  it.each([
    ["DRAFT", "Draft", "rgb(var(--color-text-rgb))"],
    ["IN_REVIEW", "In review", "rgb(var(--color-text-rgb))"],
    ["APPROVED_INTERNAL", "Approved", "rgb(var(--color-text-rgb))"],
    ["ARCHIVED", "Archived", "rgb(var(--color-text-muted-rgb))"],
  ])("colours %s text for 4.5:1 on its tint", (status, label, color) => {
    render(<HeroContinueCard trip={trip(status)} onContinue={() => {}} />);

    expect(chipColor(screen.getByText(label))).toBe(color);
  });

  it("marks the status with a dot in the tone colour", () => {
    render(<HeroContinueCard trip={trip("APPROVED_INTERNAL")} onContinue={() => {}} />);

    expect(styleValue(chipDot(screen.getByText("Approved")), "background-color")).toBe("var(--success)");
  });

  describe.each(["light", "dark"])("%s theme", (theme) => {
    it("every chip label reaches 4.5:1", () => {
      const surface = surfaceUnderChip(theme, { hover: false });

      for (const [status, label] of STATUSES) {
        const { unmount } = render(<HeroContinueCard trip={trip(status)} onContinue={() => {}} />);
        expect(chipContrast(screen.getByText(label), theme, surface), `${label} chip, ${theme}`).toBeGreaterThanOrEqual(4.5);
        unmount();
      }
    });
  });
});
