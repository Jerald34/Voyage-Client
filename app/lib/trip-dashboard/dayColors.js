/**
 * One colour per itinerary day, shared by the map pins, the day's route line and
 * the numbered badge on each stop card, so a pin and its card read as the same
 * day at a glance. White numbers pass 4.5:1 on every fill; `border` is the
 * fill's darker shade for the pin outline. Days past the palette cycle round.
 */
export const DAY_COLORS = [
  { fill: "#B4532A", border: "#7C2D12" }, // terracotta
  { fill: "#0F766E", border: "#134E4A" }, // teal
  { fill: "#6D28D9", border: "#4C1D95" }, // violet
  { fill: "#4D7C0F", border: "#365314" }, // green
  { fill: "#BE185D", border: "#831843" }, // pink
  { fill: "#A16207", border: "#713F12" }, // amber
  { fill: "#0E7490", border: "#164E63" }, // ocean
  { fill: "#475569", border: "#1E293B" }, // slate
];

export function getDayColor(dayNumber) {
  if (dayNumber === null || dayNumber === undefined || dayNumber === "") return null;
  const day = Number(dayNumber);
  if (!Number.isInteger(day) || day < 1) return null;
  return DAY_COLORS[(day - 1) % DAY_COLORS.length];
}
