import { describe, expect, it } from "vitest";
import { buildGithubIssueUrl } from "../app/lib/githubIssue.js";

describe("buildGithubIssueUrl", () => {
  it("builds a prefilled new-issue URL with encoded title and body", () => {
    const url = buildGithubIssueUrl("acme/voyage", {
      category: "BUG", subject: "Crash on save", message: "Steps...", reporterEmail: "a@b.com", appContext: "/settings"
    });
    expect(url).toContain("https://github.com/acme/voyage/issues/new?");
    expect(url).toContain("title=%5BBUG%5D+Crash+on+save");
    expect(decodeURIComponent(url)).toContain("Steps...");
    expect(decodeURIComponent(url)).toContain("a@b.com");
  });
  it("returns null when no repo is configured", () => {
    expect(buildGithubIssueUrl("", { category: "BUG", subject: "x", message: "y" })).toBeNull();
  });
});
