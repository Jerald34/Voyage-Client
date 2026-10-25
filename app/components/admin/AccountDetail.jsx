"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAccountDetail } from "../../lib/api/index.js";
import AgencyStatusPill from "./AgencyStatusPill.jsx";
import AccountActionDialog from "./AccountActionDialog.jsx";
import DeleteAccountDialog from "./DeleteAccountDialog.jsx";
import { AccountTypePill, AccountStatusPill, SuperAdminChip } from "./AccountPills.jsx";
import { AUDIT_ACTION_LABELS, MEMBERSHIP_ROLE_LABELS, SIGN_IN_LABELS, formatDate } from "./accountLabels.js";

// The same small uppercase label AgencyDetail uses. Headings default to the serif face
// (400 only), so section headings opt back into the sans (`font-sans`) rather than faking a bold serif.
const LABEL = "text-xs font-semibold uppercase tracking-wider text-text-muted";

const ACTION_FOCUS = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary";
const SECONDARY_ACTION = `rounded-sm border border-border/20 bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface/80 active:scale-[0.98] ${ACTION_FOCUS}`;
const DANGER_ACTION = `ml-auto rounded-sm border border-status-danger/30 px-4 py-2 text-sm font-semibold text-status-danger transition-colors hover:bg-status-danger/8 active:scale-[0.98] ${ACTION_FOCUS}`;

function Field({ label, children }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className={LABEL}>{label}</dt>
      <dd className="m-0 break-words text-sm text-text-primary">{children}</dd>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mb-6">
      <h3 className={`mb-3 font-sans ${LABEL}`}>{title}</h3>
      {children}
    </section>
  );
}

export default function AccountDetail({ userId, onChanged, onDeleted }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Which dialog is showing. The page keys this panel by account, so a different account is a fresh
  // panel and never inherits an open dialog.
  const [dialog, setDialog] = useState(null); // "disable" | "enable" | "sign-out" | "delete" | null
  // The account the panel is showing right now, so a late reload for an earlier one is dropped.
  const currentUserId = useRef(userId);

  useEffect(() => {
    let cancelled = false;
    currentUserId.current = userId;
    setLoading(true);
    setError(null);
    setAccount(null);
    (async () => {
      try {
        const data = await fetchAccountDetail(userId);
        if (!cancelled) setAccount(data?.user || null);
      } catch (e) {
        if (!cancelled) setError(e?.message || "Couldn't load this account.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      currentUserId.current = null;
    };
  }, [userId]);

  // A dialog found out the account changed since it loaded (new owner, already deleted...). Load it
  // again quietly, without the loading screen, so the open dialog redraws from fresh facts and keeps
  // its message. If the reload fails the dialog simply keeps what it had.
  const reloadAccount = useCallback(async () => {
    const id = userId;
    try {
      const data = await fetchAccountDetail(id);
      if (data?.user && currentUserId.current === id) setAccount(data.user);
    } catch {
      // The error the dialog is already showing is the useful one.
    }
  }, [userId]);

  if (loading) {
    return (
      <div role="status" className="py-16 text-center text-sm text-text-muted">
        Loading account details…
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="rounded-sm bg-status-danger/8 p-4 text-sm text-status-danger">
        {error}
      </div>
    );
  }
  if (!account) return null;

  const memberships = account.memberships || [];
  const signIn = (account.signInMethods || []).map((m) => SIGN_IN_LABELS[m] || m).join(", ");
  const verified = account.emailVerified ? (account.emailVerifiedAt ? formatDate(account.emailVerifiedAt) : "Verified") : "Not verified";
  const activity = account.activity || {};
  const auditEvents = account.auditEvents || [];

  // The server refuses all three for a super admin (this includes the signed-in admin's own account,
  // since only super admins reach this page) and for an account that is already deleted.
  const canAct = account.role !== "SUPER_ADMIN" && account.status !== "DELETED";

  // A dialog never closes itself after a success: the parent hides it, and the dialog clears its form when it hides.
  const handleDone = (updated) => {
    setDialog(null);
    if (updated) setAccount(updated);
    onChanged?.();
  };

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <AccountTypePill type={account.accountType} />
        {account.role === "SUPER_ADMIN" && <SuperAdminChip />}
        <AccountStatusPill status={account.status} />
      </div>

      <dl className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Email">{account.email || "—"}</Field>
        <Field label="Email verified">{verified}</Field>
        <Field label="Sign-in methods">{signIn || "—"}</Field>
        <Field label="Joined">{formatDate(account.createdAt)}</Field>
      </dl>

      <Section title="Agencies">
        {memberships.length === 0 ? (
          <p className="text-sm text-text-muted">Not a member of any agency.</p>
        ) : (
          <ul className="space-y-2">
            {memberships.map((m) => (
              <li key={m.agencyId} className="flex flex-col gap-1.5 rounded-sm border border-border/10 bg-surface p-3">
                <div className="flex items-start justify-between gap-3">
                  <span className="min-w-0 break-words text-sm font-semibold text-text-primary">{m.agencyName}</span>
                  <span className="flex-none">
                    <AgencyStatusPill status={m.agencyStatus} />
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-muted">
                  <span>{MEMBERSHIP_ROLE_LABELS[m.role] || m.role}</span>
                  {m.status === "DISABLED" && (
                    <span className="rounded-pill border border-status-danger/25 bg-status-danger/10 px-2 py-0.5 font-semibold text-status-danger">
                      Membership disabled
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Activity">
        <dl className="grid grid-cols-3 gap-3">
          {[
            ["Itineraries", activity.itineraries],
            ["Client trips", activity.clientTrips],
            ["Agent chats", activity.agentThreads],
          ].map(([label, count]) => (
            <div key={label} className="min-w-0 rounded-sm border border-border/10 bg-surface p-3">
              <dt className="text-xs text-text-muted">{label}</dt>
              <dd className="m-0 mt-1 text-xl font-semibold tabular-nums text-text-primary">{count ?? 0}</dd>
            </div>
          ))}
        </dl>
      </Section>

      {auditEvents.length > 0 && (
        <Section title="Audit trail">
          <ul className="divide-y divide-border/10">
            {auditEvents.map((event) => (
              <li key={event.id} className="py-3 first:pt-0 last:pb-0">
                <span className="block text-sm font-semibold text-text-primary">{AUDIT_ACTION_LABELS[event.action] || event.action}</span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  by {event.adminName} on {formatDate(event.createdAt)}
                </span>
                {event.reason && <span className="mt-1 block break-words text-sm text-text-muted">{event.reason}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {canAct && (
        <div className="sticky bottom-0 -mx-5 mt-4 flex flex-wrap gap-2 border-t border-border/10 bg-surface-elevated px-5 pb-2 pt-4">
          <button type="button" className={SECONDARY_ACTION} onClick={() => setDialog("sign-out")}>
            Sign out everywhere
          </button>
          {account.status === "DISABLED" ? (
            <button type="button" className={SECONDARY_ACTION} onClick={() => setDialog("enable")}>
              Enable
            </button>
          ) : (
            <button type="button" className={SECONDARY_ACTION} onClick={() => setDialog("disable")}>
              Disable
            </button>
          )}
          <button type="button" className={DANGER_ACTION} onClick={() => setDialog("delete")}>
            Delete account
          </button>
        </div>
      )}

      <AccountActionDialog
        open={dialog === "disable" || dialog === "enable" || dialog === "sign-out"}
        action={dialog}
        account={account}
        onClose={() => setDialog(null)}
        onDone={handleDone}
        onStale={reloadAccount}
      />
      <DeleteAccountDialog
        open={dialog === "delete"}
        account={account}
        onClose={() => setDialog(null)}
        onDeleted={() => {
          setDialog(null);
          onDeleted?.();
        }}
        onStale={reloadAccount}
        // "Disable instead" means nothing for an account that is already disabled.
        onDisableInstead={account.status === "DISABLED" ? undefined : () => setDialog("disable")}
      />
    </>
  );
}
