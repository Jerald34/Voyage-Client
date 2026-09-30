// The backend API origin. In the browser the app NEVER talks to this directly —
// it calls the same-origin `/api/*` path, which Next reverse-proxies here. This
// makes the session cookie FIRST-PARTY to the app origin, which is required for
// iOS standalone PWAs: WebKit's ITP blocks cross-site (SameSite=None) cookies, so
// a cross-origin API would log in but then return empty data on every fetch.
const API_PROXY_TARGET = (
  process.env.API_PROXY_TARGET ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:4000'
).replace(/\/+$/, '');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_PROXY_TARGET}/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        // Service worker must not be cached by the browser — it controls its own updates
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          // Allows the SW to intercept requests from the root scope, not just /sw.js
          { key: 'Service-Worker-Allowed', value: '/' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' },
          { key: 'Content-Type', value: 'application/manifest+json' },
        ],
      },
    ];
  },
};

export default nextConfig;
