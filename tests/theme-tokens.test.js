import { describe, expect, it } from "vitest";
import { THEMES, contrastRatio, resolve } from "./helpers/themeTokens.js";

describe.each(["light", "dark"])("%s theme", (theme) => {
  const tokens = THEMES[theme];

  it.each([
    ["--color-on-primary", "rgb(var(--color-primary-rgb))"],
    ["--color-on-secondary-strong", "var(--color-secondary-strong)"],
  ])("%s reaches 4.5:1 on its fill", (textToken, fill) => {
    expect(tokens[textToken], `${textToken} is defined`).toBeDefined();
    expect(contrastRatio(resolve(`var(${textToken})`, tokens), resolve(fill, tokens))).toBeGreaterThanOrEqual(4.5);
  });
});
