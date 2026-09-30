"use client";
import { useEffect, useState } from "react";
import {
  fetchTeam,
  listAgencyInvitations,
  revokeAgencyInvitation,
} from "@/app/lib/api/index.js";
import MemberRow from "./MemberRow";
import InviteMemberModal from "./InviteMemberModal";
import ChangeRoleModal from "./ChangeRoleModal";
import RemoveMemberModal from "./RemoveMemberModal";

export default function TeamPage({ agencyId, showJoinedNotice = false }) {
  const [data, setData] = useState({ members: [], viewerRole: null });
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [revokingId, setRevokingId] = useState(null);

  // One-time toast for STAFF redirected from Settings
  const [settingsDeniedNotice, setSettingsDeniedNotice] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const flag = sessionStorage.getItem("voyage:settingsDeniedToast");
      if (flag) {
        sessionStorage.removeItem("voyage:settingsDeniedToast");
        setSettingsDeniedNotice(true);
      }
    } catch {}
  }, []);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchTeam(agencyId);
      setData(result);
      if (result.viewerRole === "OWNER" || result.viewerRole === "ADMIN") {
        try {
          const inv = await listAgencyInvitations(agencyId);
          setInvitations(inv.invitations ?? []);
        } catch (_) {
          setInvitations([]);
        }
      } else {
        setInvitations([]);
      }
    } catch (err) {
      setError(err?.message || "Failed to load team.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRevoke(invitationId) {
    setRevokingId(invitationId);
    try {
      await revokeAgencyInvitation(agencyId, invitationId);
      setInvitations((list) => list.filter((inv) => inv.id !== invitationId));
    } catch (err) {
      setError(err?.message || "Failed to revoke invitation.");
    } finally {
      setRevokingId(null);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agencyId]);

  const canInvite = data.viewerRole === "OWNER" || data.viewerRole === "ADMIN";

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {showJoinedNotice && (
        <div role="status" className="mb-4 rounded-lg border border-status-success/25 bg-status-success/10 px-4 py-3 text-sm text-status-success">
          You joined this agency. Your workspace access is ready.
        </div>
      )}

      {settingsDeniedNotice && (
        <div className="mb-4 rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-text-muted">
          Settings are managed by your owner and admins.
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl text-text-primary">Team</h1>
        {canInvite && (
          <button
            type="button"
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition"
            onClick={() => setInviteOpen(true)}
          >
            Invite member
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        {loading ? (
          <div className="px-4 py-8 text-center text-text-muted">Loading&hellip;</div>
        ) : error ? (
          <div className="px-4 py-8 text-center text-status-danger text-sm">{error}</div>
        ) : data.members.length === 0 ? (
          <div className="px-4 py-8 text-center text-text-soft text-sm">No members yet.</div>
        ) : (
          data.members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              viewerRole={data.viewerRole}
              onChangeRole={(member) => setEditing(member)}
              onRemove={(member) => setRemoving(member)}
            />
          ))
        )}
      </div>

      {canInvite && invitations.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Pending invitations ({invitations.length})
          </h2>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            {invitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">{inv.email}</p>
                  <p className="text-xs text-text-soft">
                    {inv.role} · expires {new Date(inv.expiresAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(inv.id)}
                  disabled={revokingId === inv.id}
                  className="shrink-0 rounded-md border border-status-danger/30 px-3 py-1.5 text-xs font-semibold text-status-danger hover:bg-status-danger/10 transition disabled:opacity-50"
                >
                  {revokingId === inv.id ? "Revoking…" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {inviteOpen && (
        <InviteMemberModal
          agencyId={agencyId}
          onClose={() => setInviteOpen(false)}
          onInvited={async () => {
            setInviteOpen(false);
            await refresh();
          }}
        />
      )}
      {editing && (
        <ChangeRoleModal
          agencyId={agencyId}
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      )}
      {removing && (
        <RemoveMemberModal
          agencyId={agencyId}
          member={removing}
          onClose={() => setRemoving(null)}
          onRemoved={async () => {
            setRemoving(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}
