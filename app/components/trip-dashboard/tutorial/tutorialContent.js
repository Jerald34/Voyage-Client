// Step data for the first-run tour. buildTourSteps picks the steps for one person:
// agency members get the Dashboard, super admins get Admin, everyone gets the Planner,
// Itineraries and where to replay the tour.

// Still read by useTourFlow until Task 5 of the 2026-10-12 plan switches it to tourStorageKey.
export const VOYAGE_TOUR_STORAGE_KEY = "voyage-tour-completed-v2";

const TOUR_STORAGE_PREFIX = "voyage-tour-completed-v3";

/** The "seen the tour" flag, per account, so a new account on a shared browser still gets the tour. */
export function tourStorageKey(userId) {
  return `${TOUR_STORAGE_PREFIX}:${userId || "anonymous"}`;
}

// `audience` limits a Dashboard step to owners (and admins) or to staff.
const DASHBOARD_STEPS = [
  {
    id: "dashboard-needs-you",
    section: "Dashboard",
    tab: "dashboard",
    target: "dashboard-needs-you",
    placement: "bottom",
    compactPlacement: "bottom",
    title: "Start with what needs you",
    description: "Needs you lists what's waiting on you: client replies, share links about to expire and drafts that have stalled.",
    bullets: ["Each row says what to do next.", "Click a row to act on that trip."],
  },
  {
    id: "dashboard-calendar",
    section: "Dashboard",
    tab: "dashboard",
    target: "dashboard-calendar",
    placement: "top",
    compactPlacement: "top",
    title: "See trips by date",
    description: "The calendar marks each trip on the days it runs, plus client replies, ratings and expiring links, so busy weeks stand out.",
    bullets: ["Click a day to see everything on it.", "Open a trip from the day to see its details."],
  },
  {
    id: "dashboard-insights",
    audience: "owner",
    section: "Dashboard",
    tab: "dashboard",
    target: "dashboard-side",
    placement: "left",
    compactPlacement: "top",
    title: "Track how the agency is doing",
    description: "Insights shows how trips move from draft to approved, your key numbers and client ratings.",
    bullets: ["Switch the period to compare 7, 30 or 90 days.", "Ratings come from clients after their trip."],
  },
  {
    id: "dashboard-my-work",
    audience: "staff",
    section: "Dashboard",
    tab: "dashboard",
    target: "dashboard-side",
    placement: "left",
    compactPlacement: "top",
    title: "Pick up your work",
    description: "Your work lists the trips you're handling, starting with the one to continue next.",
    bullets: ["Continue opens the trip in the Planner.", "Your recent trips are listed below it."],
  },
];

const PLANNER_STEPS = [
  {
    id: "new-itinerary",
    section: "Planner",
    tab: "command-center",
    target: "new-itinerary",
    placement: "bottom",
    title: "Create a new itinerary",
    description: "Start a fresh trip draft from the Planner header when a new client inquiry comes in.",
    bullets: ["Voyage creates a draft you can refine before approval.", "Each draft gets its own chat with the agent."],
  },
  {
    id: "client-switcher",
    section: "Planner",
    tab: "command-center",
    target: "client-switcher",
    placement: "bottom",
    title: "Switch between trips",
    description: "Jump between live trips and drafts from one control. The chat, itinerary and map follow the trip you pick.",
    bullets: ["Open the menu to move to another trip.", "Drafts and saved trips are listed together."],
  },
  {
    id: "workspace",
    section: "Planner",
    tab: "command-center",
    target: "workspace-chat",
    placement: "right",
    title: "Plan with the agent",
    description: "Chat with Voyage here. Ask for a plan, then refine it in plain words.",
    bullets: ["Send changes through the composer at the bottom.", "Each step the agent takes shows above its reply."],
  },
  {
    id: "map-context",
    section: "Planner",
    tab: "command-center",
    target: "workspace-map",
    placement: "left",
    compactPlacement: "bottom",
    title: "Follow the plan on the map",
    description: "The map shows the stops and routes of the trip you're planning.",
    bullets: ["Pins show where each stop is.", "The map updates as the agent adds stops."],
  },
];

const ITINERARY_STEPS = [
  {
    id: "client-directory",
    section: "Itineraries",
    tab: "itineraries",
    target: "cip-client-directory",
    placement: "right",
    title: "Browse your clients",
    description: "The client list shows every traveler with a saved itinerary. Search by name or pick a client to load their trips.",
    bullets: ["Search filters the list as you type.", "Picking a client opens their saved itineraries."],
  },
  {
    id: "client-workspace",
    section: "Itineraries",
    tab: "itineraries",
    target: "cip-workspace",
    placement: "left",
    title: "Review saved itineraries",
    description: "The workspace shows the client's itinerary day by day, next to a map of every stop.",
    bullets: [
      "Days are on the left, the map on the right.",
      "Hover a stop to find it on the map.",
      "Another option in the header copies a trip as a starting point.",
    ],
  },
  {
    id: "trip-selector",
    section: "Itineraries",
    tab: "itineraries",
    target: "cip-trip-selector",
    placement: "bottom",
    title: "Compare options for a client",
    description: "When a client has more than one saved itinerary, each gets a tab. Trips to the same place are numbered as options.",
    bullets: ["Each tab loads its own days and map.", "Options are numbered in the order they were made."],
  },
  {
    id: "day-strip",
    section: "Itineraries",
    tab: "itineraries",
    target: "cip-day-strip",
    placement: "bottom",
    title: "Go through the trip by day",
    description: "The day strip moves through the trip one day at a time and updates the stops and the map together.",
    bullets: ["Click a day to focus its stops and pins.", "Use it to check pacing and where the client stays."],
  },
  {
    id: "itinerary-actions",
    section: "Itineraries",
    tab: "itineraries",
    target: "cip-actions",
    placement: "bottom",
    title: "Share, discuss and export",
    description: "Open client comments, send a share link, download a PDF or print the itinerary from here.",
    bullets: ["Comments shows client replies with an unread count.", "PDF downloads a copy; Print sends it to your printer."],
  },
];

const ADMIN_STEPS = [
  {
    id: "admin-sections",
    section: "Admin",
    tab: "admin",
    target: "admin-sections",
    placement: "bottom",
    title: "Run the platform",
    description: "Admin is where you approve new agencies and look after accounts, usage and problem reports.",
    bullets: ["Agencies lists applications waiting for review.", "Reports collects the problems people send in."],
  },
];

// No tab: the sidebar's settings button is visible from every tab.
function replayStep(pageName) {
  return {
    id: "replay-help",
    section: pageName,
    target: "settings-replay",
    placement: "right",
    title: `Replay the tour from ${pageName}`,
    description: `${pageName} keeps this tour, so you can walk through it again whenever you need to.`,
    bullets: [`Open ${pageName} from the sidebar.`, "Use Replay tutorial to start it again."],
  };
}

function firstName(user) {
  const name = String(user?.displayName ?? "").trim();
  return name ? name.split(/\s+/)[0] : "";
}

/** The tour for one person: a welcome card, then the steps for their role, in tab order. */
export function buildTourSteps(options = {}) {
  const { user = null, agencyId = null } = options ?? {};
  const isPersonal = user?.accountType === "PERSONAL";
  const hasDashboard = !isPersonal && Boolean(agencyId);
  const membership = Array.isArray(user?.memberships)
    ? user.memberships.find((entry) => entry?.agencyId === agencyId) ?? null
    : null;
  const audience = membership?.role === "STAFF" ? "staff" : "owner";

  const body = [
    ...(hasDashboard ? DASHBOARD_STEPS.filter((step) => !step.audience || step.audience === audience) : []),
    ...PLANNER_STEPS,
    ...ITINERARY_STEPS,
    ...(user?.role === "SUPER_ADMIN" ? ADMIN_STEPS : []),
    replayStep(isPersonal ? "My account" : "Settings"),
  ];

  const name = firstName(user);
  const welcome = {
    id: "welcome",
    section: null,
    tab: hasDashboard ? "dashboard" : "command-center",
    target: null,
    centered: true,
    title: name ? `Welcome to Voyage, ${name}` : "Welcome to Voyage",
    description: "A quick look at where things live. Skip it any time, and replay it later.",
    bullets: [],
    chips: [...new Set(body.map((step) => step.section))],
    nextLabel: "Start tour",
  };

  return [welcome, ...body];
}

// The generic tour, for callers that don't know the person yet.
export const voyageTourSteps = buildTourSteps();

export const voyageTourHelpBullets = [
  "The tour opens once per account. Replay it here any time.",
  "It highlights real controls on the Dashboard, Planner and Itineraries.",
  "Voyage switches tabs for you as the tour moves on.",
];
