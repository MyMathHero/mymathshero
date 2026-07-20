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
      // ── Default: pages may only be framed by our OWN origin. This blocks
      //    clickjacking of login / dashboards / payment pages. Arcade games are
      //    same-origin (/games/*), so they still embed fine. The mobile app
      //    opens payment pages in a WebView, which is NOT subject to
      //    frame-ancestors/X-Frame-Options, so this doesn't affect mobile. ──
      {
        source: "/((?!api/).*)",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self';" },
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
