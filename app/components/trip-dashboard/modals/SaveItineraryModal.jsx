"use client";

import React, { useEffect, useMemo, useState } from "react";
import ClientNameCombobox from "./ClientNameCombobox.jsx";

const normalizeText = (v) => (typeof v === "string" ? v.trim() : "");
const normalizeNum = (v) => { const t = normalizeText(v); return t ? (Number.isFinite(Number(t)) ? Number(t) : undefined) : undefined; };
const formatVal = (v) => (typeof v === "number" && Number.isFinite(v)) ? String(v) : (typeof v === "string" ? v : "");
const formatDate = (v) => { const i = formatVal(v); return i ? (i.includes("T") ? i.split("T")[0] : i.slice(0, 10)) : ""; };

export default function SaveItineraryModal({ itinerary, isSaving, error, onCancel, onSubmit, initialClientName, existingClientNames }) {
  const initialValues = useMemo(() => {
    const trip = itinerary?.trip ?? {};
    return {
      clientName: initialClientName ?? normalizeText(trip?.clientName) ?? "",
      destination: normalizeText(trip.destination) || normalizeText(trip.destinationSummary) || normalizeText(itinerary?.title ?? ""),
      startDate: formatDate(trip.startDate),
      endDate: formatDate(trip.endDate),
      travelerCount: formatVal(trip.travelerCount),
      budgetLevel: normalizeText(trip.budgetLevel),
    };
  }, [itinerary]);

  const [formState, setFormState] = useState(initialValues);
  useEffect(() => setFormState(initialValues), [initialValues]);

  const canSubmit = Boolean(normalizeText(formState.clientName) && normalizeText(formState.destination) && !isSaving);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit?.({
      clientName: normalizeText(formState.clientName),
      destination: normalizeText(formState.destination),
      startDate: normalizeText(formState.startDate) || null,
      endDate: normalizeText(formState.endDate) || null,
      travelerCount: normalizeNum(formState.travelerCount),
      budgetLevel: normalizeText(formState.budgetLevel) || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[80] grid place-items-center p-5 bg-[rgba(15,23,42,0.42)] backdrop-blur-[8px]"
      role="presentation"
    >
      <div
        className="w-[min(100%,560px)] bg-white/[0.98] dark:bg-[#1e293b] border border-[#e5e7eb] dark:border-[#334155] rounded-[20px] shadow-[0_28px_60px_rgba(15,23,42,0.18)] overflow-hidden"
        role="dialog"
        aria-modal="true"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* modal header */}
        <header className="flex items-start justify-between gap-4 px-5 pt-[18px] pb-3.5 border-b border-[#eef2f7] dark:border-[#334155]">
          <div>
            <p className="m-0 mb-1 text-[11px] font-extrabold tracking-[0.08em] uppercase text-[#b65d48]">Save to client</p>
            <h2 className="m-0 text-lg leading-[1.3] text-[#111827] dark:text-[#f1f5f9]">Save itinerary to client</h2>
          </div>
          <button
            type="button"
            className="w-[34px] h-[34px] rounded-[10px] border border-[#e5e7eb] dark:border-[#334155] bg-[#f8fafc] dark:bg-[#0f172a] text-[#374151] dark:text-[#94a3b8] text-lg leading-none cursor-pointer flex-shrink-0 hover:bg-white hover:border-[#d1d5db] dark:hover:bg-[#1e293b] dark:hover:border-[#475569]"
            onClick={onCancel}
          >
            x
          </button>
        </header>

        {/* modal form */}
        <form className="px-5 pt-[18px] pb-5" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3.5">
            <label className="grid gap-2 min-w-0">
              <span className="text-xs font-bold text-[#4b5563] dark:text-[#94a3b8]">Client name</span>
              <ClientNameCombobox
                id="approve-client-name"
                value={formState.clientName}
                onChange={(next) => setFormState({ ...formState, clientName: next })}
                suggestions={existingClientNames ?? []}
                placeholder="Enter client name"
                required
              />
            </label>
            <label className="grid gap-2 min-w-0">
              <span className="text-xs font-bold text-[#4b5563] dark:text-[#94a3b8]">Destination</span>
              <input
                type="text"
                value={formState.destination}
                onChange={(e) => setFormState({...formState, destination: e.target.value})}
                required
                placeholder="Enter destination"
                className="w-full min-w-0 px-3 py-[11px] rounded-sm border border-[#dbe2ea] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-sm text-[#111827] dark:text-[#f1f5f9] transition-[border-color,box-shadow] duration-[150ms] ease placeholder:text-[#9ca3af] dark:placeholder:text-[#64748b] focus:outline-none focus:border-[#b65d48] focus:shadow-[0_0_0_4px_rgba(182,93,72,0.12)]"
              />
            </label>
            <label className="grid gap-2 min-w-0">
              <span className="text-xs font-bold text-[#4b5563] dark:text-[#94a3b8]">Start date</span>
              <input
                type="date"
                value={formState.startDate}
                onChange={(e) => setFormState({...formState, startDate: e.target.value})}
                className="w-full min-w-0 px-3 py-[11px] rounded-sm border border-[#dbe2ea] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-sm text-[#111827] dark:text-[#f1f5f9] transition-[border-color,box-shadow] duration-[150ms] ease focus:outline-none focus:border-[#b65d48] focus:shadow-[0_0_0_4px_rgba(182,93,72,0.12)] dark:[color-scheme:dark]"
              />
            </label>
            <label className="grid gap-2 min-w-0">
              <span className="text-xs font-bold text-[#4b5563] dark:text-[#94a3b8]">End date</span>
              <input
                type="date"
                value={formState.endDate}
                onChange={(e) => setFormState({...formState, endDate: e.target.value})}
                className="w-full min-w-0 px-3 py-[11px] rounded-sm border border-[#dbe2ea] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-sm text-[#111827] dark:text-[#f1f5f9] transition-[border-color,box-shadow] duration-[150ms] ease focus:outline-none focus:border-[#b65d48] focus:shadow-[0_0_0_4px_rgba(182,93,72,0.12)] dark:[color-scheme:dark]"
              />
            </label>
            <label className="grid gap-2 min-w-0">
              <span className="text-xs font-bold text-[#4b5563] dark:text-[#94a3b8]">Travelers</span>
              <input
                type="number"
                min="1"
                value={formState.travelerCount}
                onChange={(e) => setFormState({...formState, travelerCount: e.target.value})}
                placeholder="Optional"
                className="w-full min-w-0 px-3 py-[11px] rounded-sm border border-[#dbe2ea] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-sm text-[#111827] dark:text-[#f1f5f9] transition-[border-color,box-shadow] duration-[150ms] ease placeholder:text-[#9ca3af] dark:placeholder:text-[#64748b] focus:outline-none focus:border-[#b65d48] focus:shadow-[0_0_0_4px_rgba(182,93,72,0.12)]"
              />
            </label>
            <label className="grid gap-2 min-w-0">
              <span className="text-xs font-bold text-[#4b5563] dark:text-[#94a3b8]">Budget</span>
              <input
                type="text"
                value={formState.budgetLevel}
                onChange={(e) => setFormState({...formState, budgetLevel: e.target.value})}
                placeholder="Optional"
                className="w-full min-w-0 px-3 py-[11px] rounded-sm border border-[#dbe2ea] dark:border-[#334155] bg-white dark:bg-[#0f172a] text-sm text-[#111827] dark:text-[#f1f5f9] transition-[border-color,box-shadow] duration-[150ms] ease placeholder:text-[#9ca3af] dark:placeholder:text-[#64748b] focus:outline-none focus:border-[#b65d48] focus:shadow-[0_0_0_4px_rgba(182,93,72,0.12)]"
              />
            </label>
          </div>

          {error && (
            <div className="mt-3.5 px-3 py-2.5 rounded-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-[13px] leading-[1.5]">
              {typeof error === "string" ? error : error?.message || "Unable to save draft."}
            </div>
          )}

          <footer className="flex justify-end gap-2.5 mt-[18px]">
            <button
              type="button"
              className="border border-[#e5e7eb] dark:border-[#334155] rounded-sm px-4 py-[11px] text-sm font-bold cursor-pointer transition-[transform,opacity,box-shadow] duration-[150ms] ease bg-[#f8fafc] dark:bg-[#0f172a] text-[#374151] dark:text-[#94a3b8] hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
              onClick={onCancel}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="border-none rounded-sm px-4 py-[11px] text-sm font-bold cursor-pointer transition-[transform,opacity,box-shadow] duration-[150ms] ease bg-[#b65d48] text-white shadow-[0_10px_18px_rgba(182,93,72,0.22)] hover:not-disabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:translate-y-0"
              disabled={!canSubmit}
            >
              {isSaving ? "Saving..." : "Save client plan"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
