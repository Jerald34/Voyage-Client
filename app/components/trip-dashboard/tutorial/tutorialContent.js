export const VOYAGE_TOUR_STORAGE_KEY = "voyage-tour-completed-v2";

export const voyageTourSteps = [
  // ── Command Center ─────────────────────────────────────────────────────────
  {
    id: "new-itinerary",
    tab: "command-center",
    target: "new-itinerary",
    placement: "bottom",
    title: "Create a new itinerary",
    description:
      "Start a fresh trip draft from the dashboard header without leaving the current workspace.",
    bullets: [
      "Use this when a new client inquiry comes in.",
      "Voyage creates a draft thread you can refine before approval.",
    ],
  },
  {
    id: "client-switcher",
    tab: "command-center",
    target: "client-switcher",
    placement: "bottom",
    title: "Switch active clients",
    description:
      "Jump between live trips and draft threads from the same control so the workspace follows the selected client.",
    bullets: [
      "The selected client controls the chat, itinerary, and map state.",
      "Open the menu to move to another active planning item.",
    ],
  },
  {
    id: "workspace",
    tab: "command-center",
    target: "workspace-chat",
    placement: "right",
    title: "Work in the planning space",
    description:
      "The command center on the left is where you chat with Voyage, review draft updates, and keep the itinerary work in one place.",
    bullets: [
      "Send adjustments through the chat composer at the bottom.",
      "Watch itinerary updates and tool activity stream in above.",
    ],
  },
  {
    id: "map-context",
    tab: "command-center",
    target: "workspace-map",
    placement: "left",
    compactPlacement: "bottom",
    title: "Use the map context",
    description:
      "The live map stays behind the workspace so routes, stops, and place context remain visible while planning.",
    bullets: [
      "Use map pins to keep the trip geography visible.",
      "The map updates with the active itinerary and streaming results.",
    ],
  },
  // ── Client Itineraries ─────────────────────────────────────────────────────
  {
    id: "client-directory",
    tab: "itineraries",
    target: "cip-client-directory",
    placement: "right",
    title: "Browse your clients",
    description:
      "The Client Directory lists every traveler with a saved itinerary. Search by name or pick a client to load their work.",
    bullets: [
      "Search filters the list as you type.",
      "Selecting a client opens the saved itineraries in the workspace.",
    ],
  },
  {
    id: "client-workspace",
    tab: "itineraries",
    target: "cip-workspace",
    placement: "left",
    title: "Review saved itineraries",
    description:
      "When a client is selected, the workspace shows their approved itinerary day by day, alongside a live map of every stop.",
    bullets: [
      "Day content lives on the left, the geographic context on the right.",
      "Hover a stop to highlight it on the map.",
    ],
  },
  {
    id: "trip-selector",
    tab: "itineraries",
    target: "cip-trip-selector",
    placement: "bottom",
    title: "Switch between saved trips",
    description:
      "If a client has more than one saved itinerary, use the trip tabs to jump between them without leaving the workspace.",
    bullets: [
      "Each tab loads its own day strip and map.",
      "Unread comment badges follow the active trip.",
    ],
  },
  {
    id: "day-strip",
    tab: "itineraries",
    target: "cip-day-strip",
    placement: "bottom",
    title: "Navigate the itinerary by day",
    description:
      "The day strip lets you walk through the trip one day at a time, updating the stops list and the map together.",
    bullets: [
      "Click a day to focus its stops and pins.",
      "Use the day strip to verify pacing and accommodations.",
    ],
  },
  {
    id: "itinerary-actions",
    tab: "itineraries",
    target: "cip-actions",
    placement: "bottom",
    title: "Share, discuss, and export",
    description:
      "Use the action bar to open client comments, send a share link, or export the itinerary as a polished PDF.",
    bullets: [
      "Comments shows replies from clients with an unread count.",
      "Share opens a public link; PDF downloads a copy and Print sends it to your printer.",
    ],
  },
  // ── Replay reminder ────────────────────────────────────────────────────────
  {
    id: "replay-help",
    tab: "command-center",
    target: "settings-replay",
    placement: "right",
    title: "Replay the guide later",
    description:
      "Settings keeps the tutorial available after first use, so users can reopen the same guided walkthrough whenever they need it.",
    bullets: [
      "Open Settings from the sidebar.",
      "Use Replay tutorial to run this guided tour again.",
    ],
  },
];

export const voyageTourHelpBullets = [
  "You only see the tour once unless you replay it from Settings.",
  "The tour highlights real controls across the Command Center and Client Itineraries.",
  "Voyage switches tabs for you as the walkthrough advances.",
];
