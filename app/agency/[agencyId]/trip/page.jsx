"use client";
import { use } from "react";

export default function TripListPage({ params }) {
  const { agencyId } = use(params);
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="text-xl text-text-primary">Trips</h1>
      <p className="mt-4 text-sm text-text-muted">Your agency trips will appear here.</p>
    </div>
  );
}
