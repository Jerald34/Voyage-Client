export function buildGithubIssueUrl(repo, report) {
  if (!repo) return null;
  const title = `[${report.category}] ${report.subject}`;
  const body = [
    report.message,
    "",
    "---",
    report.reporterEmail ? `Reported by: ${report.reporterEmail}` : null,
    report.appContext ? `Context: ${report.appContext}` : null,
  ].filter(Boolean).join("\n");
  const qs = new URLSearchParams({ title, body });
  return `https://github.com/${repo}/issues/new?${qs.toString()}`;
}
