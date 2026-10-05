// Rules and form helpers for editing a saved itinerary by hand on the Itineraries
// page. The server enforces the same lock; these only decide what the page offers.

export const STOP_TYPE_OPTIONS = [
  { value: "ACTIVITY", label: "Activity" },
  { value: "MEAL", label: "Meal" },
  { value: "TRANSFER", label: "Transfer" },
  { value: "CHECK_IN", label: "Check-in" },
  { value: "CHECK_OUT", label: "Check-out" },
  { value: "FREE_TIME", label: "Free time" },
  { value: "NOTE", label: "Note" },
];

// The server's limits (manualStopCreateSchema).
const STOP_LIMITS = { title: 200, startTime: 20, endTime: 20, description: 2000, clientNotes: 2000, staffNotes: 2000 };
const OPTIONAL_FIELDS = ["startTime", "endTime", "description", "clientNotes", "staffNotes"];

/**
 * Approved trips are locked until someone reopens them. Either signal locks: the trip
 * label changes first (Approve is optimistic), the itinerary status on the next load.
 */
export function isItineraryLocked({ approvalStatus, itineraryStatus } = {}) {
  return approvalStatus === "Approved" || itineraryStatus === "APPROVED_INTERNAL";
}

export function emptyStopForm() {
  return { type: "ACTIVITY", title: "", startTime: "", endTime: "", description: "", clientNotes: "", staffNotes: "" };
}

export function stopFormFromItem(item) {
  const form = emptyStopForm();
  if (!item) return form;
  const knownType = STOP_TYPE_OPTIONS.some((option) => option.value === item.type);
  return {
    type: knownType ? item.type : form.type,
    title: item.title ?? "",
    startTime: item.startTime ?? "",
    endTime: item.endTime ?? "",
    description: item.description ?? "",
    clientNotes: item.clientNotes ?? "",
    staffNotes: item.staffNotes ?? "",
  };
}

/** Field errors keyed by field name. An empty object means the form can be sent. */
export function validateStopForm(form) {
  const errors = {};
  if (!form.title.trim()) errors.title = "Add a title.";
  for (const [field, max] of Object.entries(STOP_LIMITS)) {
    if (form[field].trim().length > max) errors[field] = `Keep this under ${max} characters.`;
  }
  return errors;
}

/** The request body for a new stop: trimmed, with empty optional fields left out. */
export function stopPayloadFromForm(form) {
  const payload = { type: form.type, title: form.title.trim() };
  for (const field of OPTIONAL_FIELDS) {
    const value = form[field].trim();
    if (value) payload[field] = value;
  }
  return payload;
}

/**
 * Only the fields that changed, so an edit never rewrites what the user didn't touch.
 * A cleared field is sent as "", which the server stores as empty.
 */
export function stopPatchFromForm(form, item) {
  const before = stopFormFromItem(item);
  const patch = {};
  for (const field of Object.keys(before)) {
    const value = field === "type" ? form.type : form[field].trim();
    if (value !== before[field]) patch[field] = value;
  }
  return patch;
}

export function dayLabel(day) {
  return day?.title ? `Day ${day.dayNumber}: ${day.title}` : `Day ${day?.dayNumber}`;
}

/** Every day except `days[dayIndex]`, as the "Move to another day" choices. */
export function otherDayOptions(days, dayIndex) {
  return days
    .filter((day, index) => index !== dayIndex && day?.id)
    .map((day) => ({ id: day.id, label: dayLabel(day) }));
}

/** What the stop menu offers for the stop at `itemIndex` of `days[dayIndex]`. */
export function stopMoveOptions(days, dayIndex, itemIndex) {
  const count = days[dayIndex]?.items?.length ?? 0;
  return {
    canMoveUp: itemIndex > 0,
    canMoveDown: itemIndex < count - 1,
    otherDays: otherDayOptions(days, dayIndex),
  };
}

export function stopDisplayTitle(item) {
  return item?.title || item?.placeSnapshot?.name || item?.placeName || "this stop";
}

/** A short, plain message for a failed edit. */
export function describeEditError(error) {
  if (error?.code === "ITINERARY_LOCKED") {
    return "This trip is approved, so it can't be changed. Reopen it to make changes.";
  }
  if (error?.status === 404) {
    return "That part of the itinerary no longer exists. The latest version has been loaded.";
  }
  if (error?.code === "VALIDATION_ERROR") return "Some fields aren't valid. Check them and try again.";
  if (error?.code === "NETWORK_ERROR") return "Couldn't reach the server. Check your connection and try again.";
  return "Couldn't save your change. Try again.";
}

/** After a lock or a missing stop the page is out of date and should reload. */
export function shouldReloadAfterError(error) {
  return error?.code === "ITINERARY_LOCKED" || error?.status === 404;
}
