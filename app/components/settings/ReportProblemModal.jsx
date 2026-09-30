"use client";
import { useState } from "react";

export default function ReportProblemModal({ open, onClose, onSubmit }) {
  const [category, setCategory] = useState("BUG");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!subject.trim()) { setError("Subject is required."); return; }
    if (!message.trim()) { setError("Details are required."); return; }
    setError(""); setSubmitting(true);
    try {
      await onSubmit?.({
        category,
        subject: subject.trim(),
        message: message.trim(),
        appContext: typeof window !== "undefined" ? window.location.pathname : undefined,
      });
      onClose?.();
    } catch (err) {
      setError(err?.message || "Unable to send your report.");
    } finally {
      setSubmitting(false);
    }
  };

  const field = "mt-2 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm text-text-primary outline-none focus:border-secondary focus:ring-2 focus:ring-secondary/20";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report a problem"
        className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-[24px] border border-border bg-surface p-5 shadow-strong"
      >
        <h2 className="font-serif text-xl text-text-primary">Report a problem</h2>
        <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
          <div className="block">
            <label htmlFor="report-category" className="text-xs font-semibold uppercase tracking-[0.08em] text-text-soft">Category</label>
            <select id="report-category" value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
              <option value="BUG">Bug</option>
              <option value="BILLING">Billing</option>
              <option value="FEATURE">Feature request</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
          <div className="block">
            <label htmlFor="report-subject" className="text-xs font-semibold uppercase tracking-[0.08em] text-text-soft">Subject</label>
            <input id="report-subject" value={subject} onChange={(e) => setSubject(e.target.value)} className={field} placeholder="Short summary" />
          </div>
          <div className="block">
            <label htmlFor="report-message" className="text-xs font-semibold uppercase tracking-[0.08em] text-text-soft">Details</label>
            <textarea id="report-message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className={field} placeholder="What happened?" />
          </div>
          {error && <p className="text-sm font-medium text-red-400" role="alert">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="min-h-11 rounded-pill border border-border bg-background px-4 text-sm font-semibold text-text-primary transition active:scale-[0.97] motion-reduce:transition-none">Cancel</button>
            <button type="submit" disabled={submitting} className="min-h-11 rounded-pill bg-secondary px-5 text-sm font-semibold text-white transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none">
              {submitting ? "Sending…" : "Send report"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
