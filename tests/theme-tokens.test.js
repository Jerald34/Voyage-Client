import { describe, expect, it } from "vitest";
import { THEMES, contrastRatio, over, resolve } from "./helpers/themeTokens.js";

describe.each(["light", "dark"])("%s theme", (theme) => {
  const tokens = THEMES[theme];

  it.each([
    ["--color-on-primary", "rgb(var(--color-primary-rgb))"],
    ["--color-on-secondary-strong", "var(--color-secondary-strong)"],
  ])("%s reaches 4.5:1 on its fill", (textToken, fill) => {
    expect(tokens[textToken], `${textToken} is defined`).toBeDefined();
    expect(contrastRatio(resolve(`var(${textToken})`, tokens), resolve(fill, tokens))).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["--color-status-success", "--color-status-warning", "--color-status-danger"])(
    "%s text reaches 4.5:1 on an 8%% tint of itself over the surface",
    (token) => {
      const surface = resolve("rgb(var(--color-surface-rgb))", tokens);
      const [r, g, b] = resolve(`var(${token})`, tokens);
      const tint = over([r, g, b, 0.08], surface);
      expect(contrastRatio([r, g, b], tint)).toBeGreaterThanOrEqual(4.5);
    },
  );

  /** A calendar day tile: --frame-tile over the calendar card's --frame-tile over the page. */
  function dayTile() {
    const page = resolve("rgb(var(--color-background-rgb))", tokens);
    const card = over(resolve("var(--frame-tile)", tokens), page);
    return over(resolve("var(--frame-tile)", tokens), card);
  }

  it.each(["--color-status-danger", "--color-status-warning", "--color-status-success"])(
    "%s calendar marks reach 4.5:1 on a day tile (icons need 3:1; their counts are text and need 4.5:1)",
    (token) => {
      expect(contrastRatio(resolve(`var(${token})`, tokens), dayTile())).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("the quiet ·N count reaches 4.5:1 on a day tile", () => {
    expect(contrastRatio(resolve("rgb(var(--color-text-muted-rgb))", tokens), dayTile())).toBeGreaterThanOrEqual(4.5);
  });
});
