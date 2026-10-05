"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { fetchPublicItinerary, postPublicComment, listPublicComments } from "../../../lib/api/index.js";
import ProposalRating from "./components/ProposalRating.jsx";
import { formatCommentTime } from "../../../lib/formatters.js";
import PdfDownloadButton from "./components/PdfDownloadButton.jsx";
import ShareStopCard from "./components/ShareStopCard.jsx";
import SegmentedControl from "../../../components/admin/SegmentedControl.jsx";
import WeatherChip from "../../../components/weather/WeatherChip.jsx";
import WeatherAttribution from "../../../components/weather/WeatherAttribution.jsx";
import { useItineraryWeather } from "../../../hooks/useItineraryWeather.js";
import { attachWeatherToDays, describeDayWeather } from "../../../lib/weather/weatherDisplay.js";
import ShareHeader, { PoweredByVoyage } from "./components/ShareHeader.jsx";
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

function formatTimeRange(start, end) {
  if (start && end) return `${formatTime(start)} – ${formatTime(end)}`;
  if (start) return formatTime(start);
  if (end) return `Until ${formatTime(end)}`;
  return "";
}

const MOBILE_VIEWS = [
  { value: "itinerary", label: "Itinerary" },
  { value: "map", label: "Map" },
];

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
      className="inline-flex items-center justify-center flex-shrink-0 w-7 h-7 rounded-lg bg-secondary/10 text-secondary-strong no-underline transition-all duration-150 hover:bg-secondary/20 hover:scale-105 active:scale-95"
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
    <div className="flex items-start gap-3 px-[18px] py-4 mb-6 bg-primary/[0.04] border border-border/15 border-l-[3px] border-l-secondary rounded-sm">
      <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full bg-secondary/[0.12] text-secondary-strong mt-px hidden sm:flex">
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
                className={`px-[11px] py-[7px] border rounded-sm bg-background text-[13px] text-text-primary outline-none w-full box-border transition-all duration-150 focus:border-secondary focus:ring-[3px] focus:ring-secondary/15 ${nameError ? "border-status-danger ring-[3px] ring-status-danger/10" : "border-border/40"}`}
                placeholder="Your name *"
                value={name}
                onChange={(e) => { setName(e.target.value); setNameError(false); }}
                maxLength={80}
              />
              {nameError && <span className="text-[11px] text-status-danger font-medium">Please enter your name</span>}
            </div>
            <input
              type="email"
              className="px-[11px] py-[7px] border border-border/40 rounded-sm bg-background text-[13px] text-text-primary outline-none flex-1 min-w-[130px] max-sm:min-w-0 box-border transition-all duration-150 focus:border-secondary focus:ring-[3px] focus:ring-secondary/15"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="px-4 py-[7px] bg-secondary-strong text-on-secondary-strong border-none rounded-sm text-[13px] font-semibold cursor-pointer whitespace-nowrap flex-shrink-0 transition-all duration-150 hover:opacity-90 active:scale-97 max-sm:self-start"
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
    <form className="grid gap-2 p-3 bg-primary/[0.03] border border-border/15 rounded-sm mt-1" onSubmit={handleSubmit}>
      {status === "success" ? (
        <div className="inline-flex items-center gap-[7px] py-[10px] text-[13px] font-semibold text-status-success">
          <CheckIcon width={14} height={14} strokeWidth={2.5} className="text-status-success flex-shrink-0" />
          Comment sent!
        </div>
      ) : (
        <>
          <textarea
            ref={textareaRef}
            className="w-full box-border px-3 py-[9px] border border-border/40 rounded-sm bg-background text-[13px] leading-[1.55] text-text-primary resize-y outline-none font-[inherit] transition-all duration-150 min-h-[72px] focus:border-secondary focus:ring-[3px] focus:ring-secondary/10 disabled:opacity-60 disabled:cursor-not-allowed max-sm:p-[10px]"
            placeholder="Write a comment…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={1000}
            disabled={status === "submitting"}
          />
          {status === "error" && (
            <p className="m-0 text-[12px] text-status-danger font-medium">Something went wrong. Please try again.</p>
          )}
          <div className="flex items-center justify-end gap-2 max-[400px]:flex-col-reverse max-[400px]:items-stretch">
            <button
              type="button"
              className="px-[14px] py-[6px] border border-border/20 rounded-sm bg-transparent text-text-muted text-[12px] font-medium cursor-pointer transition-colors duration-150 hover:bg-primary/[0.06] disabled:opacity-50 disabled:cursor-not-allowed max-[400px]:text-center max-[400px]:w-full"
              onClick={onCancel}
              disabled={status === "submitting"}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-[6px] bg-secondary-strong text-on-secondary-strong border-none rounded-sm text-[12px] font-semibold cursor-pointer transition-all duration-150 hover:enabled:opacity-90 active:enabled:scale-97 disabled:opacity-45 disabled:cursor-not-allowed max-[400px]:text-center max-[400px]:w-full"
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
    ? "grid gap-1 px-[14px] py-[10px] mt-[6px] bg-surface-elevated border border-border/15 border-l-[3px] border-l-status-success rounded-sm"
    : "grid gap-1 px-[14px] py-[10px] mt-[6px] bg-secondary/[0.06] border border-dashed border-secondary/40 rounded-sm";
  const badgeCls = isAddressed
    ? "inline-flex items-center px-[7px] py-px bg-status-success/15 text-status-success rounded-pill text-[10px] font-bold tracking-[0.04em] uppercase"
    : "inline-flex items-center px-[7px] py-px bg-secondary/[0.12] text-secondary-strong rounded-pill text-[10px] font-bold tracking-[0.04em] uppercase";
  return (
    <div className={wrapperCls}>
      <div className="flex items-center gap-2">
        <span className="text-[12px] font-semibold text-text-primary">{comment.authorName}</span>
        <span className={badgeCls}>{isAddressed ? "Replied" : "Pending"}</span>
      </div>
      <p className="m-0 text-[13px] leading-[1.5] text-text-primary whitespace-pre-wrap">{comment.content}</p>
      {isAddressed && (
        <div className="mt-2 bg-background border-l-[3px] border-status-success rounded-sm px-3 py-2 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.04em] text-status-success">
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
      className={`inline-flex items-center gap-[5px] border border-border/20 rounded-sm bg-transparent text-text-muted text-[12px] font-medium cursor-pointer flex-shrink-0 transition-all duration-150 hover:bg-secondary/[0.08] hover:text-secondary-strong hover:border-secondary/30 active:bg-secondary/[0.14] ${compact ? "px-[6px] py-1 w-[26px] h-[26px] justify-center" : "px-[10px] py-[5px]"}`}
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

  const shareWeather = useItineraryWeather({
    shareToken: token,
    version: data?.itinerary?.version ?? null,
    enabled: Boolean(token && data),
  });
  // PAST, NO_DATE and NO_LOCATION entries show nothing, so they earn no credit.
  const hasVisibleWeather = useMemo(
    () => Array.from(shareWeather.byDayId.values()).some((entry) => Boolean(describeDayWeather(entry))),
    [shareWeather.byDayId],
  );

  /* ── PDF content (built ahead of the tap by PdfDownloadButton) ── */
  const pdfInput = useMemo(() => {
    if (!data?.itinerary) return null;
    const pdfTrip = data.trip ?? {};
    const agencyBrand = data.brand?.type === "agency" ? data.brand.name : null;
    return {
      title: pdfTrip.title || data.itinerary.title,
      summary: data.itinerary.summary,
      dateRange: formatDateRange(pdfTrip.startDate, pdfTrip.endDate),
      travelerCount: pdfTrip.travelerCount,
      days: attachWeatherToDays(data.itinerary.days, shareWeather.byDayId),
      // The PDF carries the brand the page header shows.
      agencyName: agencyBrand || "Voyage",
    };
  }, [data, shareWeather.byDayId]);

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
          timeLabel: formatTimeRange(item.startTime, item.endTime),
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
        <div className="grid gap-3 justify-items-center text-center max-w-[400px] px-8 py-10 bg-surface border border-border/15 rounded-lg shadow-soft">
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
          <PoweredByVoyage />
        </footer>
      </div>
    );
  }

  /* ── success ── */
  const { trip: rawTrip, itinerary, brand, share } = data;
  // Personal shares have no bound trip; fall back to an empty object so the
  // template can dereference fields safely without `trip?.` everywhere.
  const trip = rawTrip ?? {};

  return (
    <div className="flex flex-col h-dvh bg-background text-text-primary overflow-hidden">
      {/* ── top branding bar ── */}
      <ShareHeader brand={brand} />

      {/* ── mobile view switcher (hidden on desktop) ── */}
      <div className="hidden flex-shrink-0 justify-center px-4 py-2 max-sm:flex">
        <SegmentedControl
          ariaLabel="Itinerary view"
          options={MOBILE_VIEWS}
          value={mobileTab}
          onChange={setMobileTab}
          size="sm"
        />
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
          <div className="mb-8 pb-6 border-b border-border/10 max-sm:mb-6 max-sm:pb-5">
            {/* max-w-none: globals.css caps every h1 at 12ch for the landing hero. */}
            <h1 className="font-serif text-[30px] font-normal leading-[1.15] m-0 mb-[6px] max-w-none text-text-primary max-sm:text-[24px] max-[400px]:text-[22px]">
              {trip.title || itinerary.title}
            </h1>
            {trip.destinationSummary && (
              <p className="text-[15px] text-secondary-strong font-semibold m-0 mb-3">{trip.destinationSummary}</p>
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
            <PdfDownloadButton input={pdfInput} className="mt-[14px]" />
            {itinerary.summary && (
              <p className="mt-3 mb-0 text-[14px] leading-[1.6] text-text-muted">{itinerary.summary}</p>
            )}
          </div>

          {/* days */}
          <div className="grid gap-7 max-sm:gap-5">
            {itinerary.days?.map((day) => (
              <section key={day.id} className="grid gap-3">
                <div className="flex items-start gap-3">
                  <div className="grid min-w-0 flex-1 gap-1">
                    <span className="text-[0.78rem] font-extrabold uppercase tracking-wider text-secondary-strong">
                      Day {day.dayNumber}
                      {day.date ? (
                        <span className="font-semibold normal-case tracking-normal text-text-muted"> · {formatDate(day.date)}</span>
                      ) : null}
                    </span>
                    <h2 className="m-0 font-sans text-[22px] font-semibold leading-snug tracking-[-0.015em] text-text-primary max-[400px]:text-[19px]">{day.title}</h2>
                    <WeatherChip entry={shareWeather.byDayId.get(day.id)} className="mt-1 justify-self-start" />
                  </div>
                  <CommentTriggerBtn
                    label={`Comment on Day ${day.dayNumber}`}
                    compact
                    onClick={() => openForm({ type: "day", dayNumber: day.dayNumber, itemId: undefined })}
                  />
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
                  <p className="m-0 text-[13px] leading-[1.55] text-text-muted">{day.summary}</p>
                )}

                <div className="grid gap-3">
                  {day.items.map((item, idx) => {
                    const globalIdx = mapItems.findIndex(
                      (mi) => mi.__dayNumber === day.dayNumber && mi.__itemIndex === idx
                    );
                    const itemFormDescriptor = { type: "item", dayNumber: day.dayNumber, itemId: item.id };

                    return (
                      <ShareStopCard
                        key={item.id}
                        item={item}
                        isActive={activeIndex === globalIdx}
                        timeLabel={formatTimeRange(item.startTime, item.endTime)}
                        dayWeather={shareWeather.byDayId.get(day.id) ?? null}
                        icon={itemTypeIcon(item.type)}
                        onHoverChange={(hovering) => handleHoverItem(hovering ? globalIdx : -1)}
                        actions={
                          <>
                            <MapPinLink placeSnapshot={item.placeSnapshot} />
                            <CommentTriggerBtn
                              label={`Comment on ${item.title}`}
                              compact
                              onClick={() => openForm(itemFormDescriptor)}
                            />
                          </>
                        }
                      >
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
                        {getItemComments(day.dayNumber, item.id).map((c, i) => (
                          <CommentChip key={i} comment={c} />
                        ))}
                      </ShareStopCard>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
          {hasVisibleWeather ? (
            <p className="m-0 mt-4 text-center">
              <WeatherAttribution attribution={shareWeather.attribution} />
            </p>
          ) : null}

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
          <div className="grid gap-3 mt-6 px-5 py-[22px] bg-primary/[0.03] border border-border/15 rounded-md max-sm:mt-5 max-sm:p-4">
            <div className="flex items-center gap-2 text-primary">
              <ChatBubbleIcon size={16} />
              <h3 className="m-0 font-sans text-[15px] font-semibold tracking-normal text-primary">General Feedback</h3>
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
          <footer className="pt-8">
            <PoweredByVoyage />
          </footer>
        </div>

        {/* ── right: map panel, inset like the in-app day view ── */}
        <div
          className={`relative min-h-0 p-3 max-sm:p-0 ${mobileTab === "map" ? "max-sm:flex max-sm:flex-col max-sm:flex-1 max-sm:min-h-0" : "max-sm:hidden"}`}
        >
          <div className="relative h-full w-full overflow-hidden rounded-[18px] border border-border/10 shadow-soft max-sm:flex-1 max-sm:rounded-none max-sm:border-0 max-sm:shadow-none">
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
    </div>
  );
}
