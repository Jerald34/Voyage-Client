"use client";

/**
 * A small outline icon for a to-do row or calendar item, so its type is
 * readable without relying on colour. Decorative: always aria-hidden.
 */

const PATHS = {
  comment: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  star: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />,
  briefcase: (
    <>
      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </>
  ),
  send: (
    <>
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </>
  ),
};

const KIND_TO_ICON = {
  unreadComments: "comment",
  client_commented: "comment",
  sharesExpiring: "clock",
  mySharesExpiring: "clock",
  share_expires: "clock",
  viewedNotReplied: "eye",
  client_viewed: "eye",
  draftsStuck: "pencil",
  myDraftsStuck: "pencil",
  lowRated: "star",
  proposal_rated: "star",
  review_submitted: "star",
  startingSoon: "briefcase",
  trip: "briefcase",
  share_sent: "send",
};

/** True when `kind` has an icon, so callers can show their own fallback otherwise. */
export function hasKindIcon(kind) {
  return Boolean(PATHS[KIND_TO_ICON[kind]]);
}

export default function KindIcon({ kind, className = "h-4 w-4" }) {
  const icon = PATHS[KIND_TO_ICON[kind]];
  if (!icon) return null;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {icon}
    </svg>
  );
}
