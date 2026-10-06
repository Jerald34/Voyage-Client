"use client";

import { useEffect, useState } from "react";
import { fetchAccountDetail } from "../../lib/api/index.js";
import AgencyStatusPill from "./AgencyStatusPill.jsx";
import { AccountTypePill, AccountStatusPill, SuperAdminChip } from "./AccountPills.jsx";
import { MEMBERSHIP_ROLE_LABELS, SIGN_IN_LABELS, formatDate } from "./accountLabels.js";

// The same small uppercase label AgencyDetail uses. Headings default to the serif face
// (400 only), so section headings opt back into the sans (`font-sans`) rather than faking a bold serif.
const LABEL = "text-xs font-semibold uppercase tracking-wider text-text-muted";

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

export default function AccountDetail({ userId }) {
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
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
    };
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
    </>
  );
}
