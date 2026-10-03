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
});
