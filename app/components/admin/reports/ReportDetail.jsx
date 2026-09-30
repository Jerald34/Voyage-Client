"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReportDetail, updateReport } from "../../../lib/api/admin.js";
import { buildGithubIssueUrl } from "../../../lib/githubIssue.js";

const STATUSES = ["NEW", "IN_PROGRESS", "RESOLVED", "WONT_FIX"];
const REPO = process.env.NEXT_PUBLIC_GITHUB_ISSUES_REPO || "";

export default function ReportDetail({ reportId, onUpdated }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("NEW");
  const [adminNotes, setAdminNotes] = useState("");
  const [issueUrl, setIssueUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchReportDetail(reportId);
      setReport(data.report);
      setStatus(data.report.status);
      setAdminNotes(data.report.adminNotes || "");
      setIssueUrl(data.report.githubIssueUrl || "");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (patch) => {
    setSaving(true);
    setError(null);
    try {
      await updateReport(reportId, patch);
      await load();
      onUpdated?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-16 text-center text-sm text-text-muted">Loading…</div>;
  if (error && !report) return <div className="rounded-sm bg-status-danger/8 p-3 text-sm text-status-danger">{error}</div>;
  if (!report) return null;

  const githubUrl = buildGithubIssueUrl(REPO, {
    category: report.category,
    subject: report.subject,
    message: report.message,
    reporterEmail: report.reporterUser?.email,
    appContext: report.appContext,
  });

  return (
    <div className="flex flex-col gap-5">
      {error && <div className="rounded-sm bg-status-danger/8 p-3 text-sm text-status-danger">{error}</div>}

      <p className="whitespace-pre-wrap text-sm text-text-primary">{report.message}</p>
      <p className="text-xs text-text-soft">
        {report.category} · {report.reporterUser?.email || "—"}
        {report.appContext ? ` · ${report.appContext}` : ""}
      </p>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-soft">Status</span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-text-primary"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-soft">Admin notes</span>
        <textarea
          value={adminNotes}
          onChange={(e) => setAdminNotes(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-text-primary"
        />
      </label>

      <button
        type="button"
        disabled={saving}
        onClick={() => save({ status, adminNotes })}
        className="min-h-11 rounded-pill bg-secondary px-5 text-sm font-semibold text-white transition-transform active:scale-[0.97] disabled:opacity-50 motion-reduce:transition-none"
      >
        {saving ? "Saving…" : "Save"}
      </button>

      <div className="flex flex-col gap-2 border-t border-border/10 pt-4">
        {report.githubIssueUrl ? (
          <a href={report.githubIssueUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-secondary underline">
            View GitHub issue →
          </a>
        ) : (
          <>
            <a
              href={githubUrl || undefined}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex min-h-11 items-center justify-center rounded-pill border border-border px-4 text-sm font-semibold transition-transform ${
                githubUrl ? "text-text-primary hover:border-secondary active:scale-[0.97]" : "pointer-events-none opacity-50"
              }`}
            >
              Create GitHub issue
            </a>
            {!githubUrl && <span className="text-xs text-text-soft">Set NEXT_PUBLIC_GITHUB_ISSUES_REPO to enable.</span>}
            <div className="flex gap-2">
              <input
                value={issueUrl}
                onChange={(e) => setIssueUrl(e.target.value)}
                placeholder="Paste created issue URL"
                className="flex-1 rounded-2xl border border-border bg-background px-3 py-2 text-sm text-text-primary"
              />
              <button
                type="button"
                disabled={saving || !issueUrl}
                onClick={() => save({ githubIssueUrl: issueUrl })}
                className="min-h-11 rounded-pill border border-border px-3 text-sm font-semibold disabled:opacity-50"
              >
                Save URL
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
