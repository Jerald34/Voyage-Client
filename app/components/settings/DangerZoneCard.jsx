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
    <div className="mt-12 rounded-lg border border-rose-400/20 bg-rose-500/[0.03] p-6">
      <h2 className="mb-2 text-sm uppercase tracking-wider text-rose-200/70">Danger zone</h2>
      <p className="mb-4 text-sm text-white/55">
        These actions affect the entire agency and cannot be undone.
      </p>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setTransferOpen(true)}
          className="self-start rounded border border-white/10 px-3 py-1.5 text-sm text-white/75 hover:bg-white/5"
        >
          Transfer ownership&hellip;
        </button>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="self-start rounded border border-rose-400/30 px-3 py-1.5 text-sm text-rose-200/90 hover:bg-rose-500/10"
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
