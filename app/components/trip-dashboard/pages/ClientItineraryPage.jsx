import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "../../theme/ThemeProvider.jsx";
import {
  fetchItineraryDraft,
  getUnreadCommentCount,
  getUnreadCommentCountsByTrip,
  approveClientTrip,
} from "../../../lib/api/index.js";
import { getItineraryPlaceEntityId } from "../../../lib/trip-dashboard/placeEntities.js";
import { getReadablePlaceType } from "../../../lib/trip-dashboard/richItinerary.js";
import {
  getSavedItineraryTrips,
  getStableItineraryId,
  groupSavedTripsByClient,
  normalizeItineraryResponse,
  resolveSavedPortfolioSelection,
} from "../../../lib/trip-dashboard/savedItineraries.js";
import {
  TUTORIAL_ITINERARY_ID_PREFIX,
  TUTORIAL_MOCK_FULL_ITINERARY,
} from "../tutorial/tutorialMockData.js";
import ShareDialog from "../itinerary/ShareDialog.jsx";
import { generateItineraryPdf, titleToFilename } from "../../../lib/pdfExport.js";
import MobileGlassSheet from "../mobile/MobileGlassSheet.jsx";
import CompactPlaceCard from "../mobile/CompactPlaceCard.jsx";
import useMobileViewport from "../mobile/useMobileViewport.js";
import ReuseLauncher from "../../ratedHistory/entryPoints/ReuseLauncher.jsx";
import CommentsPanel from "./CommentsPanel.jsx";
import ClientList from "./ClientList.jsx";
import ItineraryHeader from "./ItineraryHeader.jsx";
import ItineraryDayView from "./ItineraryDayView.jsx";
import { Spinner, EmptyState } from "../../ui/index.js";
import {
  SearchIcon,
  ArrowLeftIcon,
  PlusIcon,
  ChatIcon,
  ShareIcon,
  DownloadIcon,
  UsersIcon,
} from "../../icons/index.js";
import {
  formatDayCardDate,
  getItemTimeLabel,
} from "../../../lib/formatters.js";

const ItineraryLiveMap = dynamic(
  () => import("../itinerary/ItineraryLiveMap.jsx"),
  { ssr: false }
);



// ── Main Component ───────────────────────────────────────────────────────────

export default function ClientItineraryPage({
  agencyTrips = [],
  agencyId,
  onDeleteTrip,
  onTourStateChange,
  tourMobilePaneOverride = null,
  onAddTripForClient,
  onTripStatusChange,
}) {
  const { theme } = useTheme();
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [approvingTripId, setApprovingTripId] = useState(null);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [fullItinerary, setFullItinerary] = useState(null);
  const [isLoadingItinerary, setIsLoadingItinerary] = useState(false);
  const [itineraryError, setItineraryError] = useState(null);
  const [activeStopIndex, setActiveStopIndex] = useState(0);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [unreadCommentCount, setUnreadCommentCount] = useState(0);
  const [unreadByTrip, setUnreadByTrip] = useState({});
  const [pdfLoading, setPdfLoading] = useState(false);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [selectedPlaceId, setSelectedPlaceId] = useState("");
  const [internalMobilePane, setInternalMobilePane] = useState("list"); // "list" | "detail" — mobile only
  // When a tour is active, HomePage drives the pane via `tourMobilePaneOverride`
  // so the tour's spotlighted target (list pane vs detail pane) is always
  // visible. User-initiated pane changes still go through setInternalMobilePane.
  const mobilePane = tourMobilePaneOverride ?? internalMobilePane;
  const setMobilePane = setInternalMobilePane;
  const [mobileMapPadding, setMobileMapPadding] = useState(0);
  const isMobile = useMobileViewport();
  const requestSequenceRef = useRef(0);

  const savedTrips = useMemo(() => getSavedItineraryTrips(agencyTrips), [agencyTrips]);
  const clients = useMemo(() => {
    const clientOrder = new Map();
    const tripOrder = new Map();
    savedTrips.forEach((trip, index) => {
      if (!tripOrder.has(trip.id)) tripOrder.set(trip.id, index);
      const clientName = String(trip?.clientName ?? "").trim().replace(/\s+/g, " ");
      const clientId = clientName.toLowerCase();
      if (clientId && !clientOrder.has(clientId)) clientOrder.set(clientId, index);
    });
    return groupSavedTripsByClient(savedTrips)
      .map((client) => ({
        ...client,
        trips: [...client.trips].sort((a, b) => (tripOrder.get(a.id) ?? 0) - (tripOrder.get(b.id) ?? 0)),
      }))
      .sort((a, b) => (clientOrder.get(a.id) ?? 0) - (clientOrder.get(b.id) ?? 0));
  }, [savedTrips]);

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedClient = clients.find(c => c.id === selectedClientId) || null;
  const selectedTrip = selectedClient?.trips.find(t => t.id === selectedTripId) || null;
  const selectedItineraryId = getStableItineraryId(selectedTrip);

  // Notify parent (HomePage) so the unified tour can filter out steps whose
  // targets are conditionally rendered (e.g. trip-selector when a client only
  // has one saved itinerary).
  const hasSelectedClient = Boolean(selectedClient);
  const hasMultipleTrips = Boolean(selectedClient && selectedClient.trips.length > 1);
  const hasItineraryDays = Boolean(
    fullItinerary && Array.isArray(fullItinerary.days) && fullItinerary.days.length > 0,
  );
  useEffect(() => {
    onTourStateChange?.({ hasSelectedClient, hasMultipleTrips, hasItineraryDays });
  }, [onTourStateChange, hasSelectedClient, hasMultipleTrips, hasItineraryDays]);

  useEffect(() => {
    const nextSelection = resolveSavedPortfolioSelection({ clients, selectedClientId, selectedTripId });
    if (nextSelection.clientId !== selectedClientId) setSelectedClientId(nextSelection.clientId);
    if (nextSelection.tripId !== selectedTripId) setSelectedTripId(nextSelection.tripId);
  }, [clients, selectedClientId, selectedTripId]);

  useEffect(() => {
    const requestId = requestSequenceRef.current + 1;
    requestSequenceRef.current = requestId;
    let cancelled = false;

    if (!agencyId || !selectedTrip || !selectedItineraryId) {
      setFullItinerary(null);
      setIsLoadingItinerary(false);
      setItineraryError(null);
      return () => { cancelled = true; };
    }

    if (selectedItineraryId.startsWith(TUTORIAL_ITINERARY_ID_PREFIX)) {
      setFullItinerary(TUTORIAL_MOCK_FULL_ITINERARY);
      setIsLoadingItinerary(false);
      setItineraryError(null);
      return () => { cancelled = true; };
    }

    setIsLoadingItinerary(true);
    setItineraryError(null);

    fetchItineraryDraft(agencyId, selectedItineraryId)
      .then((res) => {
        if (cancelled || requestSequenceRef.current !== requestId) return;
        setFullItinerary(normalizeItineraryResponse(res));
      })
      .catch((err) => {
        if (cancelled || requestSequenceRef.current !== requestId) return;
        console.error(err);
        setFullItinerary(null);
        setItineraryError(err);
      })
      .finally(() => {
        if (cancelled || requestSequenceRef.current !== requestId) return;
        setIsLoadingItinerary(false);
      });

    return () => { cancelled = true; };
  }, [agencyId, selectedTrip, selectedItineraryId]);

  // Fetch unread comment count when a trip with a valid agencyId is selected
  useEffect(() => {
    if (!agencyId || !selectedTripId) {
      setUnreadCommentCount(0);
      return;
    }
    let cancelled = false;
    getUnreadCommentCount(agencyId)
      .then((res) => {
        if (!cancelled) setUnreadCommentCount(res?.count ?? 0);
      })
      .catch(() => {
        if (!cancelled) setUnreadCommentCount(0);
      });
    return () => { cancelled = true; };
  }, [agencyId, selectedTripId, showCommentsPanel]);

  // Fetch per-trip unread counts so the Client Directory can badge each client.
  // Refreshes whenever the panel is opened/closed (reply mutates server state)
  // and whenever the agency or active trip changes.
  useEffect(() => {
    if (!agencyId) {
      setUnreadByTrip({});
      return;
    }
    let cancelled = false;
    getUnreadCommentCountsByTrip(agencyId)
      .then((res) => {
        if (cancelled) return;
        const map = {};
        (res?.counts || []).forEach(({ tripId, count }) => {
          map[tripId] = count;
        });
        setUnreadByTrip(map);
      })
      .catch(() => {
        if (!cancelled) setUnreadByTrip({});
      });
    return () => { cancelled = true; };
  }, [agencyId, selectedTripId, showCommentsPanel]);

  const unreadByClientId = useMemo(() => {
    const out = {};
    clients.forEach((c) => {
      let sum = 0;
      c.trips.forEach((t) => {
        sum += unreadByTrip[t.id] || 0;
      });
      if (sum > 0) out[c.id] = sum;
    });
    return out;
  }, [clients, unreadByTrip]);

  // Reset per-trip UI state when trip changes
  useEffect(() => {
    setShowCommentsPanel(false);
    setSelectedDayIndex(0);
    setSelectedPlaceId("");
  }, [selectedTripId]);

  const safeDays = useMemo(
    () => (Array.isArray(fullItinerary?.days) ? fullItinerary.days : []),
    [fullItinerary]
  );

  const selectedDay = safeDays[selectedDayIndex] || null;

  const mapItems = useMemo(
    () =>
      safeDays.reduce((acc, day) => {
        (day?.items || []).forEach((item, idx) =>
          acc.push({
            ...item,
            __dayNumber: day?.dayNumber,
            __dayTitle: day?.title,
            __itemIndex: idx,
            __placeEntityId: getItineraryPlaceEntityId(item, day, idx),
          })
        );
        return acc;
      }, []),
    [safeDays]
  );

  const selectedDayMapItems = useMemo(
    () =>
      selectedDay
        ? mapItems.filter((m) => m.__dayNumber === selectedDay.dayNumber)
        : mapItems,
    [mapItems, selectedDay]
  );

  const selectedMobileMapItem = useMemo(() => {
    if (!Array.isArray(selectedDayMapItems) || selectedDayMapItems.length === 0) return null;
    const selectedById = selectedDayMapItems.find((item) => item.__placeEntityId === selectedPlaceId) || null;
    const clampedIndex = Math.max(0, Math.min(activeStopIndex, selectedDayMapItems.length - 1));
    const item = selectedById || selectedDayMapItems[clampedIndex];
    if (!item) return null;

    const snapshot = item?.placeSnapshot ?? null;
    const lat = Number(item?.lat ?? item?.latitude ?? snapshot?.latitude);
    const lng = Number(item?.lng ?? item?.longitude ?? snapshot?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    const rating = snapshot?.rating ?? snapshot?.metadata?.rating ?? null;

    return {
      id: item.__placeEntityId || getItineraryPlaceEntityId(item, selectedDay, clampedIndex),
      lat,
      lng,
      name: snapshot?.name || item?.placeName || item?.title || "Untitled",
      description: item?.description || snapshot?.formattedAddress || item?.type || "",
      formattedAddress: snapshot?.formattedAddress || "",
      timeLabel: getItemTimeLabel(item),
      placeType: getReadablePlaceType(snapshot) || item?.type || "",
      rating: rating ? String(rating) : "",
    };
  }, [activeStopIndex, selectedDay, selectedDayMapItems, selectedPlaceId]);

  useEffect(() => {
    setActiveStopIndex(selectedDayMapItems.length > 0 ? 0 : -1);
    setSelectedPlaceId(selectedDayMapItems[0]?.__placeEntityId ?? "");
  }, [selectedDayMapItems]);

  const tripTitle = fullItinerary?.title || selectedTrip?.destination || "Itinerary";
  const tripSummary = fullItinerary?.summary || "";
  const tripStart = fullItinerary?.trip?.startDate || selectedTrip?.startDate;
  const tripEnd = fullItinerary?.trip?.endDate || selectedTrip?.endDate;
  const travelerCount = fullItinerary?.trip?.travelerCount || selectedTrip?.travelerCount;

  const tripDateRange = useMemo(() => {
    if (!tripStart) return "";
    const fmt = (d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return tripEnd ? `${fmt(tripStart)} - ${fmt(tripEnd)}` : fmt(tripStart);
  }, [tripStart, tripEnd]);

  const handleSelectClient = useCallback((client) => {
    setSelectedClientId(client.id);
    setSelectedTripId(client.trips[0]?.id || null);
    setMobilePane("detail");
  }, [setMobilePane]);

  const handleDeleteClient = async (client) => {
    if (!agencyId || !client) return;
    try {
      // Delete each trip sequentially to avoid overwhelming the server
      for (const trip of client.trips) {
        await onDeleteTrip?.(agencyId, trip.id);
      }
      // Auto-select next client if the deleted one was selected
      if (selectedClientId === client.id) {
        const remaining = filteredClients.filter(c => c.id !== client.id);
        if (remaining.length > 0) {
          setSelectedClientId(remaining[0].id);
          setSelectedTripId(remaining[0].trips[0]?.id || null);
        } else {
          setSelectedClientId(null);
          setSelectedTripId(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete client trips:", err);
    }
  };

  const handleDownloadPdf = async () => {
    if (!fullItinerary || pdfLoading) return;
    setPdfLoading(true);
    try {
      const dateRange = tripDateRange;
      const doc = await generateItineraryPdf({
        title: tripTitle,
        summary: tripSummary,
        dateRange,
        travelerCount,
        days: safeDays,
        agencyName: "Voyage",
      });
      doc.save(titleToFilename(tripTitle));
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleCipSnapChange = useCallback((snap) => {
    const vh = window.visualViewport?.height ?? window.innerHeight;
    if (snap === "peek") setMobileMapPadding(120);
    else if (snap === "half") setMobileMapPadding(Math.round(vh * 0.55));
    else setMobileMapPadding(Math.round(vh * 0.9));
  }, []);

  // Mobile layout: map background + glass sheet
  if (isMobile) {
    return (
      <div className="relative flex-1 h-full min-h-0 overflow-hidden">
        {/* Map background */}
        <div className="absolute inset-0 z-0">
          <ItineraryLiveMap
            items={selectedDayMapItems}
            liveMarkers={[]}
            routeEstimates={[]}
            activeIndex={activeStopIndex}
            onHoverItem={setActiveStopIndex}
            selectedPlaceId={selectedMobileMapItem?.id ?? ""}
            selectedPlace={null}
            onSelectPlace={(placeId) => {
              const nextIndex = selectedDayMapItems.findIndex((item) => item.__placeEntityId === placeId);
              if (nextIndex >= 0) {
                setActiveStopIndex(nextIndex);
                setSelectedPlaceId(placeId);
              }
            }}
            theme={theme}
            sidebarWidth={0}
            mapBottomPadding={mobileMapPadding}
          />
        </div>

        {/* Glass sheet */}
        <MobileGlassSheet
          defaultSnap="half"
          onSnapChange={handleCipSnapChange}
        >
          {mobilePane === "list" ? (
            <div className="flex flex-col h-full" data-tour-target="cip-client-directory">
              <div className="px-4 py-3 border-b border-border/5">
                <h3 className="font-serif text-[1.3rem] text-text-primary m-0 tracking-tight mb-2">Client Directory</h3>
                <div className="relative flex items-center">
                  <SearchIcon width={16} height={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-soft pointer-events-none z-[1]" />
                  <input
                    type="text"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full py-2.5 pr-3 pl-10 rounded-md border border-border/10 bg-surface text-[0.9rem] font-[inherit] text-text-primary placeholder:text-text-soft transition-all duration-200 focus:outline-none focus:border-secondary"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
                {filteredClients.length > 0 ? (
                  filteredClients.map((c) => {
                    const initials = c.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                    const isSelected = selectedClientId === c.id;
                    const unread = unreadByClientId[c.id] || 0;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200 w-full text-left ${isSelected
                          ? "bg-secondary/20 border-secondary/30 shadow-soft"
                          : "bg-transparent border-transparent hover:bg-background"
                          }`}
                        onClick={() => {
                          setSelectedClientId(c.id);
                          setSelectedTripId(c.trips[0]?.id || null);
                          setMobilePane("detail");
                        }}
                      >
                        <div className="relative flex-shrink-0">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-[0.8rem] ${isSelected ? "bg-secondary text-white" : "bg-secondary/40 text-white"
                            }`}>
                            {initials}
                          </div>
                          {unread > 0 && (
                            <span
                              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-[#dc2626] text-white text-[0.65rem] font-extrabold leading-none ring-2 ring-surface"
                              title={`${unread} unread comment${unread === 1 ? "" : "s"}`}
                            >
                              {unread > 99 ? "99+" : unread}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <strong className={`text-[0.9rem] font-bold tracking-tight truncate ${isSelected ? "text-secondary" : "text-text-primary"}`}>
                            {c.name}
                          </strong>
                          <span className="text-[0.75rem] text-text-soft font-semibold">{c.trips.length} saved itineraries</span>
                        </div>
                      </button>
                    );
                  })
                ) : clients.length === 0 ? (
                  <EmptyState
                    icon={<UsersIcon width={36} height={36} strokeWidth={1.5} className="text-secondary opacity-45" />}
                    title="No client directory yet."
                    className="flex-1 min-h-[200px]"
                  />
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full" data-tour-target="cip-workspace">
              <div className="sticky top-0 z-30 px-4 py-2.5 border-b border-white/10 bg-[rgba(17,24,39,0.15)] backdrop-blur-xl shadow-[0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setMobilePane("list")}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-text-muted bg-transparent border-0 cursor-pointer hover:text-text-primary transition-colors min-h-[40px]"
                  >
                    <ArrowLeftIcon width={14} height={14} />
                    All clients
                  </button>

                  {selectedClient && selectedItineraryId ? (
                    <div className="flex items-center gap-2">
                      {onAddTripForClient && (
                        <button
                          type="button"
                          onClick={() => onAddTripForClient(selectedClient.name)}
                          className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-secondary/30 bg-secondary/10 text-secondary transition-all duration-200"
                          aria-label={`New trip for ${selectedClient.name}`}
                        >
                          <PlusIcon width={16} height={16} strokeWidth={2.5} aria-hidden="true" />
                        </button>
                      )}
                      <div className="flex items-center gap-2" data-tour-target="cip-actions">
                        <button
                          className={`inline-flex items-center justify-center w-10 h-10 rounded-full border transition-all duration-200 ${showCommentsPanel
                            ? "bg-secondary text-white border-secondary"
                            : "bg-surface-elevated text-text-primary border-border/20"
                            }`}
                          onClick={() => setShowCommentsPanel((v) => !v)}
                          aria-label="Comments"
                        >
                        <ChatIcon width={16} height={16} />
                      </button>
                      <button
                        className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-border/20 bg-surface-elevated text-text-primary transition-all duration-200"
                        onClick={() => setShowShareDialog(true)}
                        aria-label="Share"
                      >
                        <ShareIcon width={16} height={16} />
                      </button>
                      <button
                        className={`inline-flex items-center justify-center w-10 h-10 rounded-full border border-border/20 bg-surface-elevated text-text-primary transition-all duration-200 ${pdfLoading ? "opacity-60" : ""}`}
                        onClick={handleDownloadPdf}
                        disabled={pdfLoading || !fullItinerary}
                        aria-label="Download PDF"
                      >
                        {pdfLoading ? (
                          <Spinner size="sm" />
                        ) : (
                          <DownloadIcon width={16} height={16} />
                        )}
                      </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
              {selectedClient ? (
                <div className="flex flex-col flex-1 overflow-hidden pt-2">
                  {/* Client name */}
                  <div className="px-4 py-2 border-b border-border/5">
                    <h2 className="font-serif text-[1.2rem] m-0 leading-tight truncate">{selectedClient.name}</h2>
                  </div>

                  {/* Trip selector */}
                  {selectedClient.trips.length > 1 && (
                    <div className="flex gap-2 px-4 py-2 border-b border-border/5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0" data-tour-target="cip-trip-selector">
                      {selectedClient.trips.map((t) => (
                        <button
                          key={t.id}
                          className={`px-3 py-1.5 rounded-md text-[0.75rem] font-bold whitespace-nowrap border transition-all duration-200 ${selectedTripId === t.id
                            ? "bg-secondary text-white border-secondary"
                            : "bg-surface border-border/30 text-text-soft"
                            }`}
                          onClick={() => setSelectedTripId(t.id)}
                        >
                          {t.destination || "Unnamed Trip"}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Day strip */}
                  {fullItinerary && safeDays.length > 0 && (
                    <div className="flex gap-2 px-4 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0 border-b border-border/5" data-tour-target="cip-day-strip">
                      {safeDays.map((day, dIdx) => (
                        <button
                          key={day.id || day.dayNumber || dIdx}
                          className={`px-3 py-2 rounded-md border cursor-pointer transition-all duration-200 flex-shrink-0 text-left ${selectedDayIndex === dIdx
                            ? "border-secondary/60 bg-secondary/10"
                            : "border-border/30 bg-surface"
                            }`}
                          onClick={() => setSelectedDayIndex(dIdx)}
                        >
                          <div className={`text-[0.7rem] font-extrabold tracking-wide leading-snug ${selectedDayIndex === dIdx ? "text-secondary" : "text-text-soft"}`}>
                            Day {day.dayNumber}
                          </div>
                          <div className="text-[0.65rem] text-text-soft font-semibold truncate max-w-[120px]">{day.title}</div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Comments panel */}
                  {showCommentsPanel && (
                    <div className="px-4 py-2 flex-shrink-0">
                      <CommentsPanel agencyId={agencyId} tripId={selectedTripId} itinerary={fullItinerary} onClose={() => setShowCommentsPanel(false)} />
                    </div>
                  )}

                  {/* Compact itinerary items */}
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                    {isLoadingItinerary ? (
                      <div className="flex items-center justify-center py-10 text-text-soft gap-2">
                        <Spinner size="md" />
                        <span className="text-sm">Loading...</span>
                      </div>
                    ) : selectedDay ? (
                      (selectedDay.items || []).map((item, iIdx) => {
                        return (
                          <CompactPlaceCard
                            key={`${selectedDay.dayNumber}-${iIdx}`}
                            item={item}
                            isSelected={activeStopIndex === iIdx}
                            onSelect={() => {
                              setActiveStopIndex(iIdx);
                              setSelectedPlaceId(item.__placeEntityId);
                            }}
                          />
                        );
                      })
                    ) : (
                      <div className="text-center text-text-soft py-10 text-sm">Select a day to view stops.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-soft text-center p-6">
                  <p>Select a client to view their itineraries.</p>
                </div>
              )}
            </div>
          )}
        </MobileGlassSheet>

        <ShareDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          agencyId={agencyId}
          itineraryId={selectedItineraryId}
          tripId={selectedTripId}
          tripTitle={tripTitle}
        />
      </div>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-2 h-full min-h-0 items-stretch p-2">
      {/* Client sidebar — hidden on mobile when viewing detail */}
      <aside
        data-tour-target="cip-client-directory"
        className={`glass-panel backdrop-blur-lg flex-col overflow-hidden shadow-soft ${mobilePane === "detail" ? "hidden lg:flex" : "flex"}`}
      >
        <ClientList
          clients={clients}
          filteredClients={filteredClients}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedClientId={selectedClientId}
          onSelectClient={handleSelectClient}
          onRequestDeleteClient={handleDeleteClient}
          unreadByClientId={unreadByClientId}
        />
      </aside>

      {/* Main workspace — hidden on mobile when viewing list */}
      <main
        data-tour-target="cip-workspace"
        className={`glass-panel backdrop-blur-lg flex-col overflow-hidden shadow-soft h-full ${mobilePane === "list" ? "hidden lg:flex" : "flex"}`}
      >
        {selectedClient ? (
          <div className="flex flex-col h-full overflow-hidden">
            <ItineraryHeader
              selectedClient={selectedClient}
              selectedTrip={selectedTrip}
              selectedItineraryId={selectedItineraryId}
              fullItinerary={fullItinerary}
              unreadCommentCount={unreadCommentCount}
              pdfLoading={pdfLoading}
              showCommentsPanel={showCommentsPanel}
              onBackToList={() => setMobilePane("list")}
              onAddTripForClient={onAddTripForClient}
              onToggleComments={() => setShowCommentsPanel((v) => !v)}
              onShare={() => setShowShareDialog(true)}
              onDownloadPdf={handleDownloadPdf}
              agencyId={agencyId}
              currentTrip={
                selectedTrip
                  ? {
                      tripId: selectedTrip.id,
                      destinationSummary: selectedTrip.destination,
                      startDate: selectedTrip.startDate || fullItinerary?.trip?.startDate,
                    }
                  : null
              }
              targetItineraryId={selectedItineraryId}
              currentVersion={fullItinerary?.version ?? null}
              onReuseInserted={(updatedItinerary) => {
                setFullItinerary(updatedItinerary);
              }}
            />

            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              {/* Trip selector — only shown when client has multiple saved trips */}
              {selectedClient.trips.length > 1 && (
                <div
                  data-tour-target="cip-trip-selector"
                  className="flex gap-2 px-6 py-3 border-b border-border/10 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0"
                >
                  {selectedClient.trips.map(t => (
                    <button
                      key={t.id}
                      className={`px-3.5 py-1.5 rounded-md text-[0.8rem] font-bold whitespace-nowrap border transition-all duration-200 relative ${selectedTripId === t.id
                        ? "bg-secondary text-white border-secondary"
                        : "bg-surface border-border/30 text-text-soft hover:text-text-primary hover:border-secondary/40"
                        }`}
                      onClick={() => setSelectedTripId(t.id)}
                    >
                      {t.destination || "Unnamed Trip"}
                      {selectedTripId === t.id && unreadCommentCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-pill bg-[#dc2626] text-white text-[0.6rem] font-extrabold flex items-center justify-center leading-none pointer-events-none">
                          {unreadCommentCount > 99 ? "99+" : unreadCommentCount}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Approve button — shown when selected trip is In review */}
              {selectedTrip?.approvalStatus === "In review" && (
                <div className="flex items-center gap-3 px-6 py-2 border-b border-border/10 flex-shrink-0">
                  <span className="text-[0.75rem] font-bold text-text-soft uppercase tracking-wide">Status: In review</span>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-pill bg-secondary text-white text-xs font-bold h-8 px-3 hover:-translate-y-px transition-transform disabled:opacity-50"
                    disabled={approvingTripId === selectedTrip.id}
                    onClick={async (e) => {
                      e.stopPropagation();
                      setApprovingTripId(selectedTrip.id);
                      const previous = selectedTrip.approvalStatus;
                      onTripStatusChange?.(selectedTrip.id, "Approved");
                      try {
                        await approveClientTrip(agencyId, selectedTrip.id);
                      } catch (err) {
                        onTripStatusChange?.(selectedTrip.id, previous);
                        console.error(err);
                      } finally {
                        setApprovingTripId(null);
                      }
                    }}
                  >
                    {approvingTripId === selectedTrip.id ? "Approving..." : "Approve"}
                  </button>
                </div>
              )}

              {/* Day strip */}
              {fullItinerary && safeDays.length > 0 && (
                <div
                  data-tour-target="cip-day-strip"
                  className="flex gap-3 px-6 py-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex-shrink-0 border-b border-border/10"
                >
                  {safeDays.map((day, dIdx) => (
                    <div
                      key={day.id || day.dayNumber || dIdx}
                      className={`min-w-[200px] max-w-[260px] px-4 py-3 rounded-md border cursor-pointer transition-all duration-300 flex-shrink-0 ${selectedDayIndex === dIdx
                        ? "border-secondary/60 bg-secondary/10 shadow-soft"
                        : "border-border/30 bg-surface hover:border-secondary/40 hover:-translate-y-0.5 hover:shadow-soft"
                        }`}
                      onClick={() => setSelectedDayIndex(dIdx)}
                    >
                      <div className={`text-[0.8rem] font-extrabold tracking-wide mb-1 leading-snug ${selectedDayIndex === dIdx ? "text-secondary" : "text-text-soft"}`}>
                        DAY {day.dayNumber}: {day.title}
                      </div>
                      <div className="text-[0.73rem] text-text-soft font-semibold">
                        {formatDayCardDate(day, tripStart)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Itinerary preview area */}
              <div className="flex-1 min-h-0 bg-background border-t border-border flex flex-col overflow-hidden">
                <ItineraryDayView
                  agencyId={agencyId}
                  selectedTripId={selectedTripId}
                  selectedItineraryId={selectedItineraryId}
                  fullItinerary={fullItinerary}
                  safeDays={safeDays}
                  selectedDay={selectedDay}
                  selectedDayIndex={selectedDayIndex}
                  selectedDayMapItems={selectedDayMapItems}
                  activeStopIndex={activeStopIndex}
                  setActiveStopIndex={setActiveStopIndex}
                  tripStart={tripStart}
                  isLoadingItinerary={isLoadingItinerary}
                  itineraryError={itineraryError}
                  showCommentsPanel={showCommentsPanel}
                  setShowCommentsPanel={setShowCommentsPanel}
                  theme={theme}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center flex-1 text-text-soft gap-6 text-center px-10 py-[60px]">
            <UsersIcon width={80} height={80} strokeWidth={1} className="text-secondary opacity-45" />
            <h3 className="font-serif text-[2.2rem] text-text-primary m-0 tracking-tight">No saved itineraries yet.</h3>
            <p className="max-w-[320px] mx-auto leading-relaxed text-[0.95rem] m-0">
              Saved itineraries will appear here after approval from Command Center.
            </p>
          </div>
        )}
      </main>

      <ShareDialog
        isOpen={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        agencyId={agencyId}
        itineraryId={selectedItineraryId}
        tripId={selectedTripId}
        tripTitle={tripTitle}
      />

      <style>{`
        @keyframes cip-slide-in {
          from { opacity: 0; transform: translateX(10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
