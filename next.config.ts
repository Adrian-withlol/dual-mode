import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

// Vercel Analytics loads a same-origin script (`/_vercel/insights/script.js`)
// in production and posts events to `/_vercel/insights/event` (same origin),
// so no external script/connect hosts are needed there. In local dev it
// falls back to a debug script served from va.vercel-scripts.com.
const scriptSrc = ["'self'", "'unsafe-inline'", isDev ? "https://va.vercel-scripts.com" : ""]
  .filter(Boolean)
  .join(" ");

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  // HSTS only matters over HTTPS (Vercel terminates TLS and already redirects
  // http -> https at the platform level); harmless to send in dev too.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

export default nextConfig;
