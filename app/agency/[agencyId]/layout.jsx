"use client";
import { use } from "react";
import Link from "next/link";
import { useAgencyRole } from "@/app/hooks/useAgencyRole";

export default function AgencyLayout({ children, params }) {
  const { agencyId } = use(params);
  const role = useAgencyRole(agencyId);

  const tabs = [
    { href: `/agency/${agencyId}/trip`, label: role === "STAFF" ? "My Trips" : "Trips" },
    { href: `/agency/${agencyId}/team`, label: "Team" },
    ...(role === "OWNER" || role === "ADMIN"
      ? [{ href: `/agency/${agencyId}/settings`, label: "Settings" }]
      : []),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-text-primary">
      <a
        href="#agency-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-[color:var(--accent)] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to main content
      </a>
      <nav className="flex gap-1 border-b border-border/10 bg-background/80 px-6 py-3 text-sm backdrop-blur-md" aria-label="Agency navigation">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="rounded px-3 py-1.5 text-text-muted transition-colors hover:bg-surface-elevated hover:text-text-primary"
          >
            {t.label}
          </Link>
        ))}
      </nav>
      <main id="agency-main-content" className="flex-1 min-h-0">{children}</main>
    </div>
  );
}
