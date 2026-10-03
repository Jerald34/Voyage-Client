import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";

// jsdom replaces the global URL, which node:url's fileURLToPath rejects, so resolve from import.meta.dirname
// (a plain string; the CommonJS-style __dirname is a vite-node compatibility shim that Vitest is dropping).
const ROOT = resolve(import.meta.dirname, "..");

function sourceFiles(dir = join(ROOT, "app")) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(jsx?|tsx?)$/.test(name) ? [path] : [];
  });
}

/** `!text-white`, `bg-primary!` and `bg-primary/90` all name the utility `text-white` / `bg-primary`. */
const baseUtility = (utility) => utility.replace(/^!|!$/g, "").replace(/\/(\d+|\[[^\]]+\])$/, "");

/** A line's class-like tokens, each split into its variants (`dark`, `hover`) and its base utility. */
function parseTokens(text) {
  return text
    .split(/[\s"'`{}]+/)
    .filter(Boolean)
    .map((token) => {
      const parts = token.split(":");
      return { token, variants: parts.slice(0, -1), utility: baseUtility(parts.at(-1)) };
    });
}

/** Every source line's class-like tokens. */
function* classLines() {
  for (const file of sourceFiles()) {
    const rel = relative(ROOT, file).split(sep).join("/");
    const lines = readFileSync(file, "utf8").split("\n");
    for (const [index, text] of lines.entries()) {
      yield { where: `${rel}:${index + 1}`, rel, tokens: parseTokens(text) };
    }
  }
}

// --color-primary is navy in light mode and near-white in dark mode, so plain
// white text on it disappears in dark mode. Use text-on-primary.
// Checked per line, so a pair split across lines is not caught. Within a line,
// tokens are grouped by their variants (`hover:`, `md:hover:`, `dark:`...) and a
// group holding both utilities is flagged. A pair split across groups
// (`bg-primary dark:text-white`) is not, and `bg-primary text-white
// dark:text-on-primary` is flagged even though dark mode is fixed (errs safe).
function hasWhiteOnPrimary(tokens) {
  const groups = new Map();
  for (const { variants, utility } of tokens) {
    const key = [...variants].sort().join(":");
    groups.set(key, (groups.get(key) ?? new Set()).add(utility));
  }
  return [...groups.values()].some((utilities) => utilities.has("bg-primary") && utilities.has("text-white"));
}

// Tailwind's 50-400 shades are pale: fine on dark surfaces, unreadable on
// light ones. Unless the class is dark-only (`dark:`), use a theme token.
// Every default palette in tailwindcss/theme.css (v4.3), so a new hue can't slip through.
const PALETTES =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|" +
  "slate|gray|zinc|neutral|stone|mauve|olive|mist|taupe";
const PALE_TEXT = new RegExp(`^text-(${PALETTES})-(50|100|200|300|400)$`);
// The Command Center's look is frozen until the colour sweep is signed off.
// Each entry pins one class in one file ("<path> <utility>", variants, `!` and opacity stripped).
const PALE_TEXT_ALLOWED = new Set(["app/components/trip-dashboard/command-center/ChatInput.jsx text-red-400"]);

/** The pale, non-dark-only text classes in a line's tokens that are not exempted. */
function paleTextOffenders(rel, tokens) {
  return tokens
    .filter(({ variants, utility }) => PALE_TEXT.test(utility) && !variants.includes("dark"))
    .filter(({ utility }) => !PALE_TEXT_ALLOWED.has(`${rel} ${utility}`))
    .map(({ token }) => token);
}

describe("theme-safe colour classes", () => {
  it("never puts plain white text on a primary fill", () => {
    const offenders = [];
    for (const { where, tokens } of classLines()) {
      if (hasWhiteOnPrimary(tokens)) offenders.push(where);
    }
    expect(offenders).toEqual([]);
  });

  it("never uses a pale palette text colour outside dark mode", () => {
    const offenders = [];
    for (const { where, rel, tokens } of classLines()) {
      for (const token of paleTextOffenders(rel, tokens)) offenders.push(`${where} ${token}`);
    }
    expect(offenders).toEqual([]);
  });
});

// Proves the guards above still bite on the shapes they are meant to catch.
describe("theme-safe class guard self-test", () => {
  const CHAT_INPUT = "app/components/trip-dashboard/command-center/ChatInput.jsx";

  it.each([
    "bg-primary text-white",
    "hover:bg-primary hover:text-white",
    "md:hover:bg-primary md:hover:text-white",
    "dark:bg-primary dark:text-white",
    "bg-primary/90 text-white",
    "bg-primary text-white/80",
    "bg-primary !text-white",
    "bg-primary text-white!",
    "!bg-primary/90 text-white",
  ])("flags white text on a primary fill: %s", (classes) => {
    expect(hasWhiteOnPrimary(parseTokens(classes))).toBe(true);
  });

  it.each([
    "bg-primary text-on-primary",
    "bg-primary hover:text-on-primary",
    "bg-primary-soft text-white",
    "hover:bg-primary text-on-primary",
    "bg-surface text-white",
  ])("allows: %s", (classes) => {
    expect(hasWhiteOnPrimary(parseTokens(classes))).toBe(false);
  });

  it.each([
    ["app/Foo.jsx", "text-teal-300"],
    ["app/Foo.jsx", "hover:text-indigo-200"],
    ["app/Foo.jsx", "!text-pink-400/80"],
    [CHAT_INPUT, "text-red-300"],
    [CHAT_INPUT, "text-red-400 text-emerald-300"],
    ["app/Foo.jsx", "text-red-400"],
  ])("flags pale text in %s: %s", (rel, classes) => {
    expect(paleTextOffenders(rel, parseTokens(classes)).length).toBeGreaterThan(0);
  });

  it.each([
    ["app/Foo.jsx", "text-teal-600"],
    ["app/Foo.jsx", "dark:text-teal-300"],
    ["app/Foo.jsx", "text-text-muted"],
    [CHAT_INPUT, "text-red-400"],
    [CHAT_INPUT, "hover:text-red-400/80"],
  ])("allows pale text in %s: %s", (rel, classes) => {
    expect(paleTextOffenders(rel, parseTokens(classes))).toEqual([]);
  });
});
