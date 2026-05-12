/**
 * Single source of truth for the canonical site URL.
 *
 * Order of precedence:
 * 1. NEXT_PUBLIC_SITE_URL — explicit override (custom domains).
 * 2. VERCEL_PROJECT_PRODUCTION_URL — the production alias Vercel
 *    auto-injects at build time (e.g. "mexico-bajo-lupa.vercel.app").
 *    Always served over https.
 * 3. VERCEL_URL — the per-deployment URL Vercel injects. Useful for
 *    preview deployments where the site is not yet on the production
 *    alias. Also https.
 * 4. http://localhost:3000 — dev fallback.
 *
 * Used by sitemap.ts, robots.ts, layout.tsx and any OG image route.
 */

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
