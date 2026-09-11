/**
 * Best-effort, in-memory rate limiting for /api/ask.
 *
 * IMPORTANT — Vercel serverless caveat:
 * This limiter keeps its counters in a module-level Map, which lives only in
 * the memory of a single serverless function instance. On Vercel, concurrent
 * or cold-started invocations can land on different instances that do not
 * share this Map, so a determined visitor can exceed the configured limit by
 * hitting multiple instances. This is fine as a cheap first line of defense
 * (it still stops naive abuse and accidental loops) but is NOT a durable or
 * globally-consistent limit.
 *
 * For a real limit that holds across all instances and cold starts, put a
 * shared store in front of this, e.g.:
 *   - Upstash Redis + `@upstash/ratelimit` (works great on Vercel, has a
 *     generous free tier), or
 *   - Vercel KV (Upstash-backed Redis, managed through the Vercel dashboard).
 * Swap the body of `checkRateLimit` for a call to that service and the rest
 * of the API route does not need to change.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS_PER_WINDOW = 8;

const buckets = new Map<string, Bucket>();

// Prevent unbounded memory growth from the Map across a long-lived instance.
const MAX_TRACKED_KEYS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      buckets.clear();
    }
    const resetAt = now + WINDOW_MS;
    buckets.set(key, { count: 1, resetAt });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetAt };
  }

  if (existing.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetAt: existing.resetAt };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - existing.count,
    resetAt: existing.resetAt,
  };
}
