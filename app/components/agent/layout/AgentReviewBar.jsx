"use client";

export default function AgentReviewBar({ onRevise, onEdit, onApprove }) {
  return (
    <div className="px-6 py-4 bg-white border-t border-border">
      <div className="flex gap-3 justify-end">
        <button
          className="px-4 py-2 rounded-sm text-xs font-bold cursor-pointer transition-all border border-border bg-white text-primary hover:bg-background"
          onClick={onRevise}
        >
          Ask Agent to Revise
        </button>
        <button
          className="px-4 py-2 rounded-sm text-xs font-bold cursor-pointer transition-all border border-border bg-white text-primary hover:bg-background"
          onClick={onEdit}
        >
          Edit Draft
        </button>
        <button
          className="px-4 py-2 rounded-sm text-xs font-bold cursor-pointer transition-all border border-transparent bg-primary text-on-primary hover:-translate-y-px"
          onClick={onApprove}
        >
          Mark Internally Reviewed
        </button>
        <button
          className="px-4 py-2 rounded-sm text-xs font-bold border border-[#e2e8f0] bg-[#f1f5f9] text-[#94a3b8] cursor-not-allowed"
          disabled
          title="Coming soon"
        >
          Send to Client
        </button>
      </div>
    </div>
  );
}
