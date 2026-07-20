const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  experimental: {
    // Remove if not using Server Components
    serverComponentsExternalPackages: ['mongodb'],
  },
  webpack(config, { dev }) {
    if (dev) {
      // Reduce CPU/memory from file watching
      config.watchOptions = {
        poll: 2000, // check every 2 seconds
        aggregateTimeout: 300, // wait before rebuilding
        ignored: ['**/node_modules'],
      };
    }
    return config;
  },
  onDemandEntries: {
    maxInactiveAge: 10000,
    pagesBufferLength: 2,
  },
  async headers() {
    return [
      // ── Default: pages may only be framed by our OWN origin, plus Google Tag
      //    Manager / Tag Assistant (which previews the site inside an iframe —
      //    without this, GTM Preview fails to load). Everything else is blocked,
      //    so login / dashboards / payment pages stay safe from clickjacking.
      //
      //    NOTE: we deliberately do NOT send X-Frame-Options. It's the legacy
      //    header and only understands SAMEORIGIN/DENY — it cannot whitelist
      //    Google, and (being more restrictive) it would override the CSP in
      //    browsers that honour both. CSP frame-ancestors is the modern,
      //    per-origin equivalent and is supported by all current browsers.
      //
      //    Arcade games are same-origin (/games/*) so they still embed; mobile
      //    WebViews aren't subject to these headers at all. ──
      {
        source: "/((?!api/).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors 'self' https://tagassistant.google.com https://*.googletagmanager.com;",
          },
          // Baseline hardening headers (safe, no behaviour change).
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
      // ── API routes: keep CORS open for the mobile app + waitlist. No framing
      //    headers needed (APIs aren't framed). ──
      {
        source: "/api/(.*)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "*" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
