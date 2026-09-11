"use client";

import { Analytics } from "@vercel/analytics/next";
import { useConsent } from "./consent/ConsentContext";

/**
 * Mounts Vercel Web Analytics only after the visitor explicitly accepts —
 * never before, and it unmounts immediately if consent is withdrawn.
 * Vercel Web Analytics itself is cookieless and collects only aggregate,
 * anonymized page-view metrics (see /privacy) — this gate is an extra,
 * deliberate precaution on top of that.
 */
export default function AnalyticsGate() {
  const { consent } = useConsent();
  if (consent !== "accepted") return null;
  return <Analytics />;
}
