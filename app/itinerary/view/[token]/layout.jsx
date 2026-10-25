// A share link is meant for the client it was sent to, not for search results.
// No title here: the page names the tab after the trip once it has loaded, and a
// static metadata title would overwrite that.
export const metadata = {
  robots: { index: false, follow: false },
};

export default function SharedItineraryLayout({ children }) {
  return children;
}
