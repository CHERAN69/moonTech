// TODO: Replace with Upstash Redis for production horizontal scaling
/**
 * In-memory sliding-window rate limiter for Next.js API routes.
 *
 * For production at scale, replace with an upstash/redis-based limiter.
 * This in-memory version works correctly for single-instance deployments
 * and Vercel serverless (per-region, which is acceptable for MVP).
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  limit: number
  /** Window size in seconds */
  windowSec: number
}

const DEFAULTS: RateLimitOptions = { limit: 60, windowSec: 60 }

/**
 * Returns { success: true } if under limit, { success: false } otherwise.
 * `key` should be IP + route, e.g. `${ip}:/api/analyze`.
 */
export function rateLimit(
  key: string,
  opts: RateLimitOptions = DEFAULTS
): { success: boolean; remaining: number; resetAt: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + opts.windowSec * 1000 })
    return { success: true, remaining: opts.limit - 1, resetAt: now + opts.windowSec * 1000 }
  }

  if (entry.count >= opts.limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt }
  }

  entry.count++
  return { success: true, remaining: opts.limit - entry.count, resetAt: entry.resetAt }
}

/** Extract IP from Next.js request headers */
export function getIP(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

/** Tighter limit for AI-backed endpoints */
export const AI_LIMIT: RateLimitOptions  = { limit: 20, windowSec: 60 }
/** Normal limit for data endpoints */
export const API_LIMIT: RateLimitOptions = { limit: 120, windowSec: 60 }
/** Auth limit to prevent brute force */
export const AUTH_LIMIT: RateLimitOptions = { limit: 10, windowSec: 60 }
