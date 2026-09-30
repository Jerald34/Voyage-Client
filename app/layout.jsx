import { Plus_Jakarta_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";
import ThemeProvider from "./components/theme/ThemeProvider";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const dmSerifDisplay = DM_Serif_Display({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata = {
  title: "Voyage | Itinerary-first travel planning",
  description:
    "Intelligent travel planning for professionals. Build beautiful itineraries, coordinate trips, and delight clients — all in one place.",
  manifest: "/manifest.json",
  applicationName: "Voyage",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Voyage",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/icons/icon-192.png",
  },
  openGraph: {
    title: "Voyage Planner",
    description: "Intelligent itinerary-first travel planning.",
    type: "website",
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630 }],
  },
};

export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#223843" },
    { media: "(prefers-color-scheme: dark)", color: "#101820" },
  ],
  width: "device-width",
  initialScale: 1,
  // Do NOT set maximumScale: 1 or userScalable: false — pinch-zoom is an
  // accessibility requirement (WCAG 1.4.4). Users with low vision need it.
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${plusJakartaSans.variable} ${dmSerifDisplay.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Inline theme script runs before paint to prevent flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('voyage-theme');if(t==='dark')document.documentElement.classList.add('dark')})()`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                ${
                  process.env.NODE_ENV === "production"
                    ? `window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js', { scope: '/' })
                    .catch(function(err) { console.warn('SW registration failed:', err); });
                });`
                    : `// Development: never run a service worker. A stale worker that
                // caches /api/* breaks streaming (the agent SSE stream is served
                // from cache and never hits the network), so actively unregister
                // any existing worker and clear its caches, then reload once so
                // the page is no longer SW-controlled.
                navigator.serviceWorker.getRegistrations().then(function(regs) {
                  var hadWorker = regs.length > 0;
                  Promise.all(regs.map(function(r) { return r.unregister(); })).then(function() {
                    if (window.caches && caches.keys) {
                      caches.keys().then(function(keys) {
                        keys.forEach(function(k) { caches.delete(k); });
                      });
                    }
                    if (hadWorker && !sessionStorage.getItem('voyage-sw-killed')) {
                      sessionStorage.setItem('voyage-sw-killed', '1');
                      location.reload();
                    }
                  });
                });`
                }
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
