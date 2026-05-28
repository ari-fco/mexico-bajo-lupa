import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Strict mode catches subtle bugs in dev (double-render to surface
  // unsafe side effects). Production already runs without it.
  reactStrictMode: true,

  // Trim the trailing slash off URLs (canonical form for SEO).
  trailingSlash: false,

  // Security headers — applied to every response.
  async headers() {
    // Content-Security-Policy: defensa estructural contra XSS y data
    // exfiltration. Permite solo lo que el sitio realmente necesita.
    //
    // - script-src: 'self' (Next.js inlines scripts en SSG; necesita
    //   'unsafe-inline' para los chunks SSG inline críticos).
    // - style-src 'unsafe-inline': Tailwind 4 + next/font generan estilos
    //   inline al render. Sin 'unsafe-inline' se rompe el styling.
    // - img-src/connect-src: incluye data: y blob: porque maplibre-gl
    //   crea workers blob y renderiza tiles como data URIs.
    // - font-src 'self' data:: next/font hostea las fuentes localmente,
    //   data: cubre los OG images que embebenen fonts inline.
    // - frame-ancestors 'none': equivalente moderno a X-Frame-Options DENY.
    // - worker-src blob:: maplibre crea web workers desde blob URIs.
    // - object-src 'none': defensa contra plugins embebidos.
    // - base-uri 'self': previene injection via <base> tag.
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://demotiles.maplibre.org",
      "font-src 'self' data:",
      "connect-src 'self' https://demotiles.maplibre.org",
      "worker-src 'self' blob:",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          // Defense in depth: CSP es la línea principal contra XSS.
          { key: "Content-Security-Policy", value: csp },
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
