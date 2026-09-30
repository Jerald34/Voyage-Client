"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchPublicItinerary, postPublicComment, listPublicComments } from "../../../lib/api/index.js";
import ProposalRating from "./components/ProposalRating.jsx";
import { formatCommentTime } from "../../../lib/formatters.js";
import { generateItineraryPdf, titleToFilename } from "../../../lib/pdfExport.js";
import ThemeToggle from "../../../components/theme/ThemeToggle";
import Spinner from "../../../components/ui/Spinner";
import {
  PlaneIcon,
  HotelIcon,
  ForkKnifeIcon,
  CarIcon,
  MapPinIcon,
  ChatIcon,
  UserIcon,
  CheckIcon,
  CalendarIcon,
  UsersIcon,
  ListIcon,
  MapIcon,
  CloseIcon,
} from "../../../components/icons/index.js";

const ItineraryLiveMap = dynamic(
  () =>
    import(
      "../../../components/trip-dashboard/itinerary/ItineraryLiveMap.jsx"
    ),
  { ssr: false }
);

/* ── helpers ─────────────────────────────────────────────────── */

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateRange(start, end) {
  if (!start) return "";
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const opts = { month: "short", day: "numeric" };
  const startStr = s.toLocaleDateString("en-US", opts);
  if (!e) return startStr;
  const endStr = e.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `${startStr} – ${endStr}`;
}

function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

function buildGoogleMapsUrl(placeSnapshot) {
  if (!placeSnapshot) return null;
  const { latitude, longitude, provider, providerPlaceId } = placeSnapshot;
  if (latitude == null || longitude == null) return null;

  let url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  if (provider === "GOOGLE_MAPS" && providerPlaceId) {
    url += `&query_place_id=${providerPlaceId}`;
  }
  return url;
}

function itemTypeIcon(type) {
  switch (type?.toUpperCase()) {
    case "FLIGHT":
      return <PlaneIcon width={16} height={16} />;
    case "HOTEL":
    case "ACCOMMODATION":
      return <HotelIcon width={16} height={16} />;
    case "RESTAURANT":
    case "DINING":
      return <ForkKnifeIcon width={16} height={16} />;
    case "TRANSPORT":
    case "TRANSFER":
      return <CarIcon width={16} height={16} />;
    default:
      return <MapPinIcon width={16} height={16} />;
  }
}

/* ── map-pin icon for Google Maps link ──────────────────────── */

function MapPinLink({ placeSnapshot }) {
  const url = buildGoogleMapsUrl(placeSnapshot);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-lg bg-secondary/10 text-secondary no-underline transition-all duration-150 hover:bg-secondary/20 hover:scale-105 active:scale-95"
      title="Open in Google Maps"
      aria-label={`Open ${placeSnapshot.name || "location"} in Google Maps`}
    >
      <MapPinIcon width={14} height={14} strokeWidth={2.5} />
    </a>
  );
}

/* ── chat bubble icon ────────────────────────────────────────── */

function ChatBubbleIcon({ size = 14 }) {
  return <ChatIcon width={size} height={size} />;
}

/* ── name prompt banner ──────────────────────────────────────── */

function NamePromptBanner({ onComplete }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [nameError, setNameError] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError(true);
      inputRef.current?.focus();
      return;
    }
    onComplete(trimmed, email.trim() || null);
  }

  return (
    <div className="flex items-start gap-3 px-[18px] py-4 mb-6 bg-primary/[0.04] border border-border border-l-[3px] border-l-secondary rounded-sm">
      <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-secondary/[0.12] text-secondary mt-px hidden sm:flex">
        <UserIcon width={18} height={18} />
      </div>
      <div className="flex-1 min-w-0 grid gap-[10px]">
        <p className="m-0 text-[13px] leading-[1.5] text-text-soft">
          Want to leave comments on this itinerary? Let us know your name first.
        </p>
        <form className="flex items-start gap-2 flex-wrap max-sm:flex-col" onSubmit={handleSubmit}>
          <div className="flex gap-2 flex-1 min-w-0 flex-wrap max-sm:flex-col">
            <div className="flex flex-col gap-1 flex-1 min-w-[130px] max-sm:min-w-0">
              <input
                ref={inputRef}
                type="text"
                className={`px-[11px] py-[7px] border rounded-sm bg-background text-[13px] text-text-primary outline-none w-full box-border transition-all duration-150 focus:border-secondary focus:shadow-[0_0_0_3px_rgba(215,122,97,0.12)] ${nameError ? "border-red-500 shadow-[0_0_0_3px_rgba(224,92,92,0.1)]" : "border-border/40"}`}
                placeholder="Your name *"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(false); }}
                maxLength={80}
              />
              {nameError && <span className="text-[11px] text-red-500 font-medium">Please enter your name</span>}
            </div>
            <input
              type="email"
              className="px-[11px] py-[7px] border border-border/40 rounded-sm bg-background text-[13px] text-text-primary outline-none flex-1 min-w-[130px] max-sm:min-w-0 box-border transition-all duration-150 focus:border-secondary focus:shadow-[0_0_0_3px_rgba(215,122,97,0.12)]"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-[7px] bg-secondary text-white border-none rounded-sm text-[13px] font-semibold cursor-pointer whitespace-nowrap flex-shrink-0 transition-all duration-150 hover:bg-[#c46a51] active:scale-97 max-sm:self-start"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── inline comment form ─────────────────────────────────────── */

function CommentForm({ token, dayNumber, itemId, commenterName, commenterEmail, onCancel, onPosted, onRefresh }) {
  const [text, setText] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;

    setStatus("submitting");

    const payload = { authorName: commenterName, content: trimmed };
    if (commenterEmail) payload.authorEmail = commenterEmail;
    if (dayNumber != null) payload.dayNumber = dayNumber;
    if (itemId != null) payload.itemId = itemId;

    try {
      const res = await postPublicComment(token, payload);
      setStatus("success");
      onPosted(res?.comment ?? { content: trimmed, dayNumber, itemId, authorName: commenterName, status: "PENDING", createdAt: new Date().toISOString() });
      onRefresh?.();
      setTimeout(() => onCancel(), 2000);
    } catch {
      setStatus("error");
    }
  }

  return (
    <form className="grid gap-2 p-3 bg-primary/[0.03] border border-border rounded-sm mt-1" onSubmit={handleSubmit}>
      {status === "success" ? (
        <div className="inline-flex items-center gap-[7px] py-[10px] text-[13px] font-semibold text-[#2a7a4f]">
          <CheckIcon width={14} height={14} strokeWidth={2.5} className="text-[#2a7a4f] flex-shrink-0" />
          Comment sent!
        </div>
      ) : (
        <>
          <textarea
            ref={textareaRef}
            className="w-full box-border px-3 py-[9px] border border-border/40 rounded-sm bg-background text-[13px] leading-[1.55] text-text-primary resize-y outline-none font-[inherit] transition-all duration-150 min-h-[72px] focus:border-secondary focus:shadow-[0_0_0_3px_rgba(215,122,97,0.1)] disabled:opacity-60 disabled:cursor-not-allowed max-sm:p-[10px]"
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={1000}
            disabled={status === "submitting"}
          />
          {status === "error" && (
            <p className="m-0 text-[12px] text-red-500 font-medium">Something went wrong. Please try again.</p>
          )}
          <div className="flex items-center justify-end gap-2 max-[400px]:flex-col-reverse max-[400px]:items-stretch">
            <button
              type="button"
              className="px-[14px] py-[6px] border border-border rounded-sm bg-transparent text-text-soft text-[12px] font-medium cursor-pointer transition-colors duration-150 hover:bg-primary/[0.06] disabled:opacity-50 disabled:cursor-not-allowed max-[400px]:text-center max-[400px]:w-full"
              onClick={onCancel}
              disabled={status === "submitting"}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-[6px] bg-secondary text-white border-none rounded-sm text-[12px] font-semibold cursor-pointer transition-all duration-150 hover:enabled:bg-[#c46a51] active:enabled:scale-97 disabled:opacity-45 disabled:cursor-not-allowed max-[400px]:text-center max-[400px]:w-full"
              disabled={!text.trim() || status === "submitting"}
            >
              {status === "submitting" ? "Sending…" : "Send"}
            </button>
          </div>
        </>
      )}
    </form>
  );
}

/* ── submitted comment chip ──────────────────────────────────── */

function CommentChip({ comment }) {
  const isAddressed = comment.status === "ADDRESSED" && comment.agencyReply;
  const wrapperCls = isAddressed
    ? "grid gap-1 px-[14px] py-[10px] mt-[6px] bg-surface-elevated border border-border border-l-[3px] border-l-[#16a34a] rounded-sm"
    : "grid gap-1 px-[14px] py-[10px] mt-[6px] bg-secondary/[0.06] border border-dashed border-secondary/30 rounded-sm";
  const badgeCls = isAddressed
    ? "inline-flex items-center px-[7px] py-px bg-[#16a34a]/15 text-[#16a34a] rounded-pill text-[10px] font-bold tracking-[0.04em] uppercase"
    : "inline-flex items-center px-[7px] py-px bg-secondary/[0.12] text-secondary rounded-pill text-[10px] font-bold tracking-[0.04em] uppercase";
  return (
    <div className={wrapperCls}>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-text-primary">{comment.authorName}</span>
        <span className={badgeCls}>{isAddressed ? "Replied" : "Pending"}</span>
      </div>
      <p className="m-0 text-[13px] leading-[1.5] text-text-primary whitespace-pre-wrap">{comment.content}</p>
      {isAddressed && (
        <div className="mt-2 bg-background border-l-[3px] border-[#16a34a] rounded-sm px-3 py-2 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.04em] text-[#16a34a]">
            Agency reply
          </div>
          <p className="m-0 text-[13px] leading-[1.5] text-text-primary whitespace-pre-wrap">{comment.agencyReply}</p>
          {comment.agencyRepliedAt && (
            <span className="text-[11px] text-text-soft">{formatCommentTime(comment.agencyRepliedAt)}</span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── comment trigger button ──────────────────────────────────── */

function CommentTriggerBtn({ label, compact, onClick }) {
  return (
    <button
      type="button"
      className={`inline-flex items-center gap-[5px] border border-border rounded-sm bg-transparent text-text-soft text-[12px] font-medium cursor-pointer flex-shrink-0 transition-all duration-150 hover:bg-secondary/[0.08] hover:text-secondary hover:border-secondary/30 active:bg-secondary/[0.14] ${compact ? "px-[6px] py-1 w-[26px] h-[26px] justify-center" : "px-[10px] py-[5px]"}`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <ChatBubbleIcon size={12} />
      {!compact && <span>Comment</span>}
    </button>
  );
}

/* ── main page component ────────────────────────────────────── */

export default function PublicItineraryPage() {
  const { token } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  /* mobile tab toggle */
  const [mobileTab, setMobileTab] = useState("itinerary");

  /* map interaction */
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);

  /* commenter identity */
  const [commenterName, setCommenterName] = useState(null);
  const [commenterEmail, setCommenterEmail] = useState(null);
  const [showNamePrompt, setShowNamePrompt] = useState(false);

  /* active comment form: null | { type, dayNumber?, itemId? } */
  const [activeForm, setActiveForm] = useState(null);

  /* persisted comments (fetched from backend, includes agency replies) */
  const [comments, setComments] = useState([]);

  const refreshComments = useCallback(async () => {
    if (!token) return;
    try {
      const res = await listPublicComments(token);
      const list = Array.isArray(res?.comments) ? res.comments : [];
      setComments(list);
    } catch {
      /* swallow — keep previous state */
    }
  }, [token]);

  /* ── load commenter identity from localStorage ── */
  useEffect(() => {
    const storedName = localStorage.getItem("voyage_commenter_name");
    const storedEmail = localStorage.getItem("voyage_commenter_email");
    if (storedName) {
      setCommenterName(storedName);
      setCommenterEmail(storedEmail || null);
    }
  }, []);

  /* ── fetch ── */
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchPublicItinerary(token)
      .then((res) => {
        if (!cancelled) {
          setData(res);
          const storedName = localStorage.getItem("voyage_commenter_name");
          if (!storedName) setShowNamePrompt(true);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          if (err.status === 404) {
            setError({ type: "not_found", message: "This itinerary link is not valid." });
          } else if (err.status === 410) {
            setError({ type: "expired", message: "This share link has expired or been revoked." });
          } else {
            setError({ type: "generic", message: "Unable to load itinerary. Please try again later." });
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  /* ── fetch persisted comments + agency replies ── */
  useEffect(() => {
    if (!token) return;
    refreshComments();
    const onFocus = () => refreshComments();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [token, refreshComments]);

  /* ── transform items for map ── */
  const mapItems = useMemo(() => {
    if (!data?.itinerary?.days) return [];
    return data.itinerary.days.flatMap((day) =>
      day.items.map((item, idx) => ({
        ...item,
        __dayNumber: day.dayNumber,
        __dayTitle: day.title,
        __itemIndex: idx,
        __placeEntityId: `place-${day.dayNumber}-${idx}`,
      }))
    );
  }, [data]);

  /* ── map callbacks ── */
  const handleHoverItem = useCallback((index) => {
    setActiveIndex(index);
  }, []);

  const handleSelectPlace = useCallback(
    (placeId) => {
      setSelectedPlaceId(placeId || "");
      if (!placeId) {
        setSelectedPlace(null);
        return;
      }
      const item = mapItems.find((i) => i.__placeEntityId === placeId);
      if (item?.placeSnapshot) {
        setSelectedPlace({
          id: placeId,
          lat: Number(item.placeSnapshot.latitude),
          lng: Number(item.placeSnapshot.longitude),
          name: item.placeSnapshot.name,
          formattedAddress: item.placeSnapshot.formattedAddress,
          description: item.description,
          dayLabel: `Day ${item.__dayNumber}`,
          timeLabel:
            item.startTime && item.endTime
              ? `${formatTime(item.startTime)} – ${formatTime(item.endTime)}`
              : item.startTime
                ? formatTime(item.startTime)
                : "",
        });
      }
    },
    [mapItems]
  );

  /* ── name prompt handler ── */
  function handleNameComplete(name, email) {
    localStorage.setItem("voyage_commenter_name", name);
    if (email) localStorage.setItem("voyage_commenter_email", email);
    setCommenterName(name);
    setCommenterEmail(email);
    setShowNamePrompt(false);
  }

  /* ── comment form helpers ── */
  function openForm(descriptor) {
    if (!commenterName) {
      setShowNamePrompt(true);
      return;
    }
    setActiveForm(descriptor);
  }

  function closeForm() {
    setActiveForm(null);
  }

  function handlePosted(comment) {
    setComments((prev) => {
      if (comment?.id && prev.some((c) => c.id === comment.id)) return prev;
      return [...prev, comment];
    });
  }

  function getItemComments(dayNumber, itemId) {
    return comments.filter(
      (c) => c.dayNumber === dayNumber && c.itemId === itemId
    );
  }

  function getDayComments(dayNumber) {
    return comments.filter(
      (c) => c.dayNumber === dayNumber && c.itemId == null
    );
  }

  function getGeneralComments() {
    return comments.filter(
      (c) => c.dayNumber == null && c.itemId == null
    );
  }

  function isFormActive(descriptor) {
    if (!activeForm) return false;
    return (
      activeForm.type === descriptor.type &&
      activeForm.dayNumber === descriptor.dayNumber &&
      activeForm.itemId === descriptor.itemId
    );
  }

  /* ── loading state ── */
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-background gap-5">
        <Spinner size="lg" />
        <p className="text-[14px] text-text-soft font-medium m-0">Loading your itinerary...</p>
      </div>
    );
  }

  /* ── error state ── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-dvh bg-background px-6">
        <div className="grid gap-3 justify-items-center text-center max-w-[400px] px-8 py-10 bg-surface border border-border rounded-lg shadow-soft">
          <div className="mb-1">
            {error.type === "expired" ? (
              <CalendarIcon width={48} height={48} strokeWidth={1.5} />
            ) : (
              <CloseIcon width={48} height={48} strokeWidth={1.5} />
            )}
          </div>
          <h1 className="font-serif text-2xl font-normal text-primary m-0">
            {error.type === "not_found" && "Link Not Found"}
            {error.type === "expired" && "Link Expired"}
            {error.type === "generic" && "Something Went Wrong"}
          </h1>
          <p className="text-[15px] leading-[1.5] text-text-muted m-0">{error.message}</p>
          <p className="text-[12px] text-text-soft m-0">
            If you believe this is a mistake, please contact your travel agent.
          </p>
        </div>
        <footer className="mt-8">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-soft opacity-60">Powered by Voyage</span>
        </footer>
      </div>
    );
  }

  /* ── PDF export ── */
  async function handleDownloadPdf() {
    if (!data || pdfLoading) return;
    setPdfLoading(true);
    try {
      const { trip, itinerary } = data;
      const dateRange = formatDateRange(trip.startDate, trip.endDate);
      const doc = await generateItineraryPdf({
        title:         trip.title || itinerary.title,
        summary:       itinerary.summary,
        dateRange,
        travelerCount: trip.travelerCount,
        days:          itinerary.days,
        agencyName:    "Voyage",
      });
      doc.save(titleToFilename(trip.title || itinerary.title));
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setPdfLoading(false);
    }
  }

  /* ── success ── */
  const { trip: rawTrip, itinerary, brand, share } = data;
  // Personal shares have no bound trip; fall back to an empty object so the
  // template can dereference fields safely without `trip?.` everywhere.
  const trip = rawTrip ?? {};

  /* ── brand node for header ── */
  let brandNode;
  if (!brand || brand.type === "agency") {
    // Agency (or legacy response without brand): show agency name + logo if present,
    // otherwise fall back to the "Voyage" wordmark.
    if (brand?.name || brand?.logoUrl) {
      brandNode = (
        <div className="flex items-center gap-2">
          {brand.logoUrl && (
            <img
              src={brand.logoUrl}
              alt={brand.name || "Agency logo"}
              className="h-7 w-auto object-contain flex-shrink-0"
            />
          )}
          {brand.name && (
            <span className="font-serif text-[20px] tracking-[0.02em] max-sm:text-[18px]">{brand.name}</span>
          )}
        </div>
      );
    } else {
      brandNode = <span className="font-serif text-[20px] tracking-[0.02em] max-sm:text-[18px]">Voyage</span>;
    }
  } else if (brand.type === "personal") {
    brandNode = (
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] font-medium uppercase tracking-[0.1em] opacity-60 max-sm:text-[9px]">Shared by</span>
        <span className="text-[16px] font-semibold tracking-[0.01em] max-sm:text-[14px]">{brand.displayName || "Traveler"}</span>
      </div>
    );
  } else {
    // Unknown brand type — safe fallback
    brandNode = <span className="font-serif text-[20px] tracking-[0.02em] max-sm:text-[18px]">Voyage</span>;
  }

  return (
    <div className="flex flex-col h-dvh bg-background text-text-primary overflow-hidden">
      {/* ── top branding bar ── */}
      <header className="flex items-center justify-between px-6 py-3 bg-sidebar text-white flex-shrink-0 z-20 max-sm:px-4 max-sm:py-[10px]">
        {brandNode}
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] opacity-70 max-sm:text-[10px]">Shared Itinerary</span>
        <ThemeToggle />
      </header>

      {/* ── mobile tab toggle (hidden on desktop) ── */}
      <div className="hidden max-sm:flex gap-0 bg-surface border-b border-border flex-shrink-0 z-[15]">
        <button
          className={`flex-1 inline-flex items-center justify-center gap-[6px] py-3 border-none bg-none text-[13px] font-semibold cursor-pointer transition-all duration-150 relative after:content-[''] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:rounded-sm after:transition-colors after:duration-200 ${mobileTab === "itinerary" ? "text-primary after:bg-secondary" : "text-text-soft after:bg-transparent"}`}
          onClick={() => setMobileTab("itinerary")}
        >
          <ListIcon width={16} height={16} className="flex-shrink-0" />
          Itinerary
        </button>
        <button
          className={`flex-1 inline-flex items-center justify-center gap-[6px] py-3 border-none bg-none text-[13px] font-semibold cursor-pointer transition-all duration-150 relative after:content-[''] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-[2px] after:rounded-sm after:transition-colors after:duration-200 ${mobileTab === "map" ? "text-primary after:bg-secondary" : "text-text-soft after:bg-transparent"}`}
          onClick={() => setMobileTab("map")}
        >
          <MapIcon width={16} height={16} className="flex-shrink-0" />
          Map
        </button>
      </div>

      {/* ── main split layout ── */}
      <div className="grid grid-cols-[45fr_55fr] flex-1 min-h-0 overflow-hidden max-sm:flex max-sm:flex-col">
        {/* ── left: timeline panel ── */}
        <div
          className={`overflow-y-auto overflow-x-hidden px-7 py-8 pb-12 scrollbar-thin scrollbar-color-border scrollbar-track-transparent max-sm:px-4 max-sm:py-5 max-sm:pb-10 max-[400px]:px-3 max-[400px]:py-4 max-[400px]:pb-8 ${mobileTab === "itinerary" ? "max-sm:flex max-sm:flex-col max-sm:flex-1 max-sm:min-h-0" : "max-sm:hidden"}`}
        >
          {/* name prompt banner */}
          {showNamePrompt && (
            <NamePromptBanner onComplete={handleNameComplete} />
          )}

          {/* trip header */}
          <div className="mb-8 pb-6 border-b border-border max-sm:mb-6 max-sm:pb-5">
            <h1 className="font-serif text-[28px] font-normal leading-[1.2] m-0 mb-[6px] text-primary max-sm:text-[22px] max-[400px]:text-[20px]">
              {trip.title || itinerary.title}
            </h1>
            {trip.destinationSummary && (
              <p className="text-[15px] text-secondary font-semibold m-0 mb-3">{trip.destinationSummary}</p>
            )}
            <div className="flex flex-wrap gap-4 mb-2 max-sm:gap-3">
              {(trip.startDate || trip.endDate) && (
                <span className="inline-flex items-center gap-[6px] text-[13px] text-text-soft font-medium">
                  <CalendarIcon width={14} height={14} className="flex-shrink-0 text-text-soft" />
                  {formatDateRange(trip.startDate, trip.endDate)}
                </span>
              )}
              {trip.travelerCount > 0 && (
                <span className="inline-flex items-center gap-[6px] text-[13px] text-text-soft font-medium">
                  <UsersIcon width={14} height={14} className="flex-shrink-0 text-text-soft" />
                  {trip.travelerCount} {trip.travelerCount === 1 ? "traveler" : "travelers"}
                </span>
              )}
            </div>
            <button
              className={`inline-flex items-center gap-[7px] mt-[14px] px-4 py-2 rounded-pill border border-border bg-surface text-primary text-[13px] font-semibold cursor-pointer transition-all duration-150 whitespace-nowrap hover:enabled:bg-background hover:enabled:border-secondary hover:enabled:shadow-[0_2px_8px_rgba(215,122,97,0.12)] active:enabled:scale-97 disabled:opacity-65 disabled:cursor-not-allowed`}
              onClick={handleDownloadPdf}
              disabled={pdfLoading}
              aria-label="Download itinerary as PDF"
            >
              {pdfLoading ? (
                <>
                  <Spinner size="sm" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download PDF
                </>
              )}
            </button>
            {itinerary.summary && (
              <p className="mt-3 mb-0 text-[14px] leading-[1.6] text-text-muted">{itinerary.summary}</p>
            )}
          </div>

          {/* days */}
          <div className="grid gap-7 max-sm:gap-5">
            {itinerary.days?.map((day) => (
              <section key={day.id} className="grid gap-3">
                <div className="flex items-start gap-3">
                  <span className="inline-flex items-center justify-center flex-shrink-0 w-14 h-7 bg-secondary text-white rounded-pill text-[11px] font-bold tracking-[0.04em] uppercase max-[400px]:w-12 max-[400px]:h-6 max-[400px]:text-[10px]">
                    Day {day.dayNumber}
                  </span>
                  <div className="flex flex-col gap-[2px] pt-[2px]">
                    <h2 className="font-serif text-[19px] font-normal leading-[1.3] m-0 text-primary max-[400px]:text-[17px]">{day.title}</h2>
                    {day.date && (
                      <span className="text-[12px] text-text-soft font-medium">{formatDate(day.date)}</span>
                    )}
                  </div>
                  <div className="ml-auto">
                    <CommentTriggerBtn
                      label={`Comment on Day ${day.dayNumber}`}
                      compact
                      onClick={() => openForm({ type: "day", dayNumber: day.dayNumber, itemId: undefined })}
                    />
                  </div>
                </div>

                {/* inline day-level comment form */}
                {isFormActive({ type: "day", dayNumber: day.dayNumber, itemId: undefined }) && (
                  <div>
                    <CommentForm
                      token={token}
                      dayNumber={day.dayNumber}
                      itemId={undefined}
                      commenterName={commenterName}
                      commenterEmail={commenterEmail}
                      onCancel={closeForm}
                      onPosted={handlePosted}
                      onRefresh={refreshComments}
                    />
                  </div>
                )}

                {/* pending day-level comments */}
                {getDayComments(day.dayNumber).map((c, i) => (
                  <div key={i}>
                    <CommentChip comment={c} />
                  </div>
                ))}

                {day.summary && (
                  <p className="m-0 pl-[68px] text-[13px] leading-[1.55] text-text-soft max-sm:pl-0">{day.summary}</p>
                )}

                <div className="grid gap-0 pl-6 max-sm:pl-3 max-[400px]:pl-1">
                  {day.items.map((item, idx) => {
                    const globalIdx = mapItems.findIndex(
                      (mi) =>
                        mi.__dayNumber === day.dayNumber &&
                        mi.__itemIndex === idx
                    );
                    const isActive = activeIndex === globalIdx;

                    const itemFormDescriptor = { type: "item", dayNumber: day.dayNumber, itemId: item.id };

                    return (
                      <div
                        key={item.id}
                        className={`grid grid-cols-[24px_1fr] gap-3 py-2 transition-colors duration-150 rounded-sm ${isActive ? "bg-secondary/[0.08]" : ""}`}
                        onMouseEnter={() => handleHoverItem(globalIdx)}
                        onMouseLeave={() => handleHoverItem(-1)}
                      >
                        {/* connector: dot + vertical line */}
                        <div className="flex flex-col items-center pt-[6px]">
                          <span className={`w-[10px] h-[10px] rounded-full flex-shrink-0 ${isActive ? "bg-secondary shadow-[0_0_0_3px_rgba(215,122,97,0.18)]" : "bg-secondary shadow-[0_0_0_3px_rgba(215,122,97,0.15)]"}`} />
                          {idx < day.items.length - 1 && (
                            <span className="w-[2px] flex-1 min-h-4 bg-border" />
                          )}
                        </div>

                        <div className="grid gap-[6px] pb-3">
                          <div className="flex items-start gap-2">
                            <div className={`flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-lg text-primary ${isActive ? "bg-primary/10" : "bg-primary/[0.06]"}`}>
                              {itemTypeIcon(item.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-[15px] font-semibold leading-[1.3] m-0 text-text-primary max-[400px]:text-[14px]">{item.title}</h3>
                              {(item.startTime || item.endTime) && (
                                <span className="text-[12px] text-text-soft font-medium">
                                  {item.startTime && formatTime(item.startTime)}
                                  {item.startTime && item.endTime && " – "}
                                  {item.endTime && formatTime(item.endTime)}
                                </span>
                              )}
                            </div>
                            <MapPinLink placeSnapshot={item.placeSnapshot} />
                            <CommentTriggerBtn
                              label={`Comment on ${item.title}`}
                              compact
                              onClick={() => openForm(itemFormDescriptor)}
                            />
                          </div>

                          {item.description && (
                            <p className="m-0 text-[13px] leading-[1.55] text-text-muted pl-9">{item.description}</p>
                          )}

                          {item.placeSnapshot?.name && (
                            <div className="flex items-start gap-[6px] pl-9 text-[12px] text-text-soft leading-[1.4]">
                              <MapPinIcon width={12} height={12} className="flex-shrink-0 mt-[1px]" />
                              <span>{item.placeSnapshot.name}</span>
                              {item.placeSnapshot.formattedAddress && (
                                <span className="block mt-px text-text-soft opacity-80">
                                  {item.placeSnapshot.formattedAddress}
                                </span>
                              )}
                            </div>
                          )}

                          {item.clientNotes && (
                            <div className="flex items-start gap-[6px] px-3 py-2 ml-9 mt-[2px] bg-secondary/[0.06] rounded-sm border-l-[3px] border-secondary text-[12px] text-text-muted leading-[1.5]">
                              <ChatIcon width={12} height={12} className="flex-shrink-0 mt-[1px] text-secondary" />
                              <span>{item.clientNotes}</span>
                            </div>
                          )}

                          {/* inline item comment form */}
                          {isFormActive(itemFormDescriptor) && (
                            <CommentForm
                              token={token}
                              dayNumber={day.dayNumber}
                              itemId={item.id}
                              commenterName={commenterName}
                              commenterEmail={commenterEmail}
                              onCancel={closeForm}
                              onPosted={handlePosted}
                      onRefresh={refreshComments}
                            />
                          )}

                          {/* pending item-level comments */}
                          {getItemComments(day.dayNumber, item.id).map((c, i) => (
                            <CommentChip key={i} comment={c} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          {/* ── proposal rating ── */}
          <div className="mt-10 max-sm:mt-7">
            <ProposalRating
              token={token}
              initialRating={share?.proposalRating ?? null}
              initialComment={share?.proposalRatingComment ?? null}
              initialRatedAt={share?.proposalRatedAt ?? null}
            />
          </div>

          {/* ── general feedback section ── */}
          <div className="grid gap-3 mt-6 px-5 py-[22px] bg-primary/[0.03] border border-border rounded-md max-sm:mt-5 max-sm:p-4">
            <div className="flex items-center gap-2 text-primary">
              <ChatBubbleIcon size={16} />
              <h3 className="font-serif text-[17px] font-normal m-0 text-primary">General Feedback</h3>
            </div>
            <p className="m-0 text-[13px] leading-[1.5] text-text-soft">
              Have overall thoughts about this itinerary? Share them here.
            </p>

            {isFormActive({ type: "general", dayNumber: undefined, itemId: undefined }) ? (
              <CommentForm
                token={token}
                dayNumber={undefined}
                itemId={undefined}
                commenterName={commenterName}
                commenterEmail={commenterEmail}
                onCancel={closeForm}
                onPosted={handlePosted}
                      onRefresh={refreshComments}
              />
            ) : (
              <CommentTriggerBtn
                label="Add general feedback"
                onClick={() => openForm({ type: "general", dayNumber: undefined, itemId: undefined })}
              />
            )}

            {getGeneralComments().map((c, i) => (
              <CommentChip key={i} comment={c} />
            ))}
          </div>

          {/* bottom branding */}
          <footer className="pt-8 text-center">
            <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-text-soft opacity-60">Powered by Voyage</span>
          </footer>
        </div>

        {/* ── right: map panel ── */}
        <div
          className={`relative border-l border-border min-h-0 max-sm:border-l-0 max-sm:border-t max-sm:border-border ${mobileTab === "map" ? "max-sm:flex max-sm:flex-col max-sm:flex-1 max-sm:min-h-0" : "max-sm:hidden"}`}
        >
          <ItineraryLiveMap
            items={mapItems}
            liveMarkers={[]}
            routeEstimates={[]}
            activeIndex={activeIndex}
            onHoverItem={handleHoverItem}
            selectedPlaceId={selectedPlaceId}
            selectedPlace={selectedPlace}
            onSelectPlace={handleSelectPlace}
            sidebarWidth={0}
          />
        </div>
      </div>
    </div>
  );
}
