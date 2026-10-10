import { PlaneIcon, HotelIcon, ForkKnifeIcon, CarIcon, MapPinIcon } from "../../../../components/icons/index.js";

/** "13:30" → "1:30 PM". Anything unparseable is shown as written. */
function formatTime(timeStr) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":");
  const hour = parseInt(h, 10);
  if (isNaN(hour)) return timeStr;
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${m} ${ampm}`;
}

/** A stop's time pill text, shared by the share page and the landing page's sample trip. */
export function formatTimeRange(start, end) {
  if (start && end) return `${formatTime(start)} – ${formatTime(end)}`;
  if (start) return formatTime(start);
  if (end) return `Until ${formatTime(end)}`;
  return "";
}

/** The tile icon a stop card shows when its place has no photo. */
export function itemTypeIcon(type) {
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
