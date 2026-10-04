"use client";
import { useEffect, useState } from "react";
import TransferOwnershipModal from "./TransferOwnershipModal";
import DeleteAgencyModal from "./DeleteAgencyModal";
import { fetchTeam } from "@/app/lib/api/index.js";

export default function DangerZoneCard({ agencyId, agencyName, members: membersProp }) {
  const [transferOpen, setTransferOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [fetchedMembers, setFetchedMembers] = useState(null);

  // Lazily load members the first time the transfer modal opens — only needed for OWNER.
  useEffect(() => {
    if (!transferOpen) return;
    if (membersProp || fetchedMembers || !agencyId) return;
    let cancelled = false;
    fetchTeam(agencyId)
      .then((res) => { if (!cancelled) setFetchedMembers(res?.members || []); })
      .catch(() => { if (!cancelled) setFetchedMembers([]); });
    return () => { cancelled = true; };
  }, [transferOpen, membersProp, fetchedMembers, agencyId]);

  const members = membersProp || fetchedMembers || [];

  return (
    <div className="mt-12 rounded-lg border border-status-danger/25 bg-status-danger/[0.04] p-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-status-danger">Danger zone</h2>
      <p className="mb-4 text-sm text-text-muted">
        These actions affect the entire agency and cannot be undone.
      </p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setTransferOpen(true)}
          className="self-start rounded border border-border/25 px-3 py-1.5 text-sm text-text-primary hover:bg-border/10"
        >
          Transfer ownership&hellip;
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="self-start rounded border border-status-danger/40 px-3 py-1.5 text-sm text-status-danger hover:bg-status-danger/10"
        >
          Delete agency&hellip;
        </button>
      </div>

      {transferOpen && (
        <TransferOwnershipModal
          agencyId={agencyId}
          members={members}
          onClose={() => setTransferOpen(false)}
        />
      )}
      {deleteOpen && (
        <DeleteAgencyModal
          agencyId={agencyId}
          agencyName={agencyName}
          onClose={() => setDeleteOpen(false)}
        />
      )}
    </div>
  );
}
