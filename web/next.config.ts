import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode catches subtle bugs in dev (double-render to surface
  // unsafe side effects). Production already runs without it.
  reactStrictMode: true,

  // Trim the trailing slash off URLs (canonical form for SEO).
  trailingSlash: false,

  // Security headers — applied to every response.
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Disallow framing the site (defense against clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          // Block content-type sniffing.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Modern referrer policy: only same-origin sends the path.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Disable powerful APIs we don't use.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
