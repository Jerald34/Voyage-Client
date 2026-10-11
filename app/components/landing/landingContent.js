/** All landing-page copy. Data only (no JSX), so it's easy to test and edit. */

export const LANDING_NAV = [
  { label: "What it does", href: "#what-it-does" },
  { label: "How it works", href: "#how-it-works" },
  { label: "For agencies", href: "#for-agencies" },
  { label: "FAQ", href: "#faq" },
];

export const HERO = {
  overline: "AI itinerary planning for travel agencies",
  title: "Plan client trips in minutes, not hours",
  body: "Describe a trip in chat. Voyage builds a day-by-day plan with real places, opening checks and the weather, ready to share as a branded link, PDF or print.",
  sampleNote: "The sample trip here is real Voyage output. Rain was forecast for the afternoon: the views come first and the indoor stops sit in the wet hours.",
};

export const SAMPLE_SECTION = {
  title: "A real trip, planned by Voyage",
  body: "Two days in Baguio by private car. The stops, times, notes and forecast are the AI's own output.",
};

export const SAMPLE_CALLOUTS = [
  { title: "Weather for every stop", body: "An hourly forecast for each stop, not one guess for the whole day." },
  { title: "Planned around the rain", body: "The viewpoint comes before 11 AM. The mall lands in the hour rain is most likely." },
  { title: "Real places, checked", body: "Where Voyage matches a place, its photos, rating and address come from Google, and closed places get flagged before your client sees them." },
  { title: "Notes your client reads", body: "Each stop carries a short note written for the traveller." },
  { title: "Matches the map", body: "Stop numbers use the same day colour as the pins on the map." },
];

export const AFTER_THE_PLAN = {
  overline: "After the plan",
  title: "From draft to a client who said yes",
  body: "The same trip, through the rest of Voyage. Everything here is built from Voyage's own components, and nothing you do here is sent anywhere.",
};

export const AFTER_THE_PLAN_TABS = [
  {
    id: "ask",
    label: "Asks first",
    title: "Asks before it guesses",
    body: "When a brief leaves out something that changes the plan, Voyage asks. These are the real questions it asked an agent planning a Mayon Volcano day trip.",
  },
  {
    id: "share",
    label: "Share link",
    title: "One link for your client",
    body: "No app and no login for them. Add the client's name or an expiry date if you like, and revoke the link any time.",
  },
  {
    id: "feedback",
    label: "Client feedback",
    title: "Your client comments and rates",
    body: "Clients can comment on any stop and rate the proposal, and you can reply from Voyage. Try the rating: this one is a demo, so nothing is sent.",
  },
  {
    id: "pdf",
    label: "PDF and print",
    title: "PDF and print from the same trip",
    body: "The PDF is built in the browser from the itinerary, with times, places and each day's weather. Print sends that same PDF to the printer. These buttons make the real PDF of the Baguio trip.",
  },
  {
    id: "approve",
    label: "Approve and lock",
    title: "Approve it, then lock it",
    body: "Saving a trip to the client puts it in review. Approving it locks the itinerary so it can't change by accident. Reopen it on purpose to edit.",
  },
];

/** `icon` names a key in LandingSections' FEATURE_ICONS map. */
export const FEATURES = [
  { icon: "chat", title: "Plan by chat", body: "Describe the trip. The AI drafts it and asks when something's missing." },
  { icon: "place", title: "Real places, checked", body: "Stops are matched to real places, and closed ones get flagged." },
  { icon: "weather", title: "Weather per stop", body: "Hourly forecasts for dated trips, and typical weather for far-off dates." },
  { icon: "map", title: "A map for each day", body: "Colour-coded pins and routes, one colour per day." },
  { icon: "share", title: "Share, PDF and print", body: "A branded link your client can comment on and rate." },
  { icon: "lock", title: "Approve and lock", body: "Approving locks the trip. Editing reopens it on purpose." },
  { icon: "star", title: "Reuse top-rated stops", body: "Pull stops from past trips your clients rated 4 or higher." },
  { icon: "calendar", title: "Team calendar", body: "Every departure and its status in one view." },
];

export const STEPS = [
  { title: "Brief", body: "Paste the client's request or type it in your own words." },
  { title: "Draft", body: "Get a mapped, checked day-by-day plan in a few minutes." },
  { title: "Refine", body: "Change it by chat or by hand, and reuse stops clients loved." },
  { title: "Share", body: "Approve it, then send a link, a PDF or a printout." },
];

export const AUDIENCES = [
  {
    title: "For agency owners",
    body: "A calendar of every departure, what's in review, and how clients rated each trip.",
  },
  {
    title: "For agents",
    body: "Plan in one workspace: chat with the AI, edit stops by hand, reuse what worked, and save it to the client for review.",
  },
];

export const FAQS = [
  {
    question: "Can I change what the AI plans?",
    answer: "Yes. Ask in chat (\"swap the museum for a café\") or edit any stop by hand: times, notes and order. Approved trips stay locked until you reopen them.",
  },
  {
    question: "What does my client see?",
    answer: "A branded web page with each day, the map, photos, your notes and the weather. They can comment on any stop, rate the proposal, and download a PDF to keep or print. They don't need an account.",
  },
  {
    question: "Where does the weather come from?",
    answer: "Open-Meteo. Dated trips inside the forecast window get an hourly forecast for every stop. Trips further out show typical weather for those dates from past years, labelled as typical.",
  },
  {
    question: "Can my whole team use it?",
    answer: "Yes. Owners invite agents to the agency. Agents plan trips and save them for review, and approving one locks it.",
  },
];

export const FINAL_CTA = {
  title: "Plan your next client trip with Voyage",
  body: "Start with a real request from your inbox. You'll have a draft to review in minutes.",
};
