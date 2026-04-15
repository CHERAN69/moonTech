import { describe, it, expect, beforeEach, vi } from 'vitest'

// Reset module between tests so the in-memory store is cleared
beforeEach(() => {
  vi.resetModules()
})

describe('rateLimit', () => {
  it('allows requests within the limit', async () => {
    const { rateLimit } = await import('../rate-limit')
    const result = rateLimit('test-key-allow', { limit: 5, windowSec: 60 })
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('blocks after limit is exceeded', async () => {
    const { rateLimit } = await import('../rate-limit')
    const opts = { limit: 3, windowSec: 60 }
    const key = 'test-key-block'
    rateLimit(key, opts)
    rateLimit(key, opts)
    rateLimit(key, opts)
    const result = rateLimit(key, opts)
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets after the window expires', async () => {
    vi.useFakeTimers()
    const { rateLimit } = await import('../rate-limit')
    const key = 'test-key-reset'
    const opts = { limit: 1, windowSec: 1 }

    rateLimit(key, opts) // use the 1 slot
    const blocked = rateLimit(key, opts)
    expect(blocked.success).toBe(false)

    vi.advanceTimersByTime(1100) // advance past the 1s window

    const allowed = rateLimit(key, opts)
    expect(allowed.success).toBe(true)
    vi.useRealTimers()
  })

  it('getIP returns x-forwarded-for when present', async () => {
    const { getIP } = await import('../rate-limit')
    const req = new Request('http://localhost/test', {
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
    })
    expect(getIP(req)).toBe('203.0.113.1')
  })

  it('getIP falls back to x-real-ip', async () => {
    const { getIP } = await import('../rate-limit')
    const req = new Request('http://localhost/test', {
      headers: { 'x-real-ip': '198.51.100.5' },
    })
    expect(getIP(req)).toBe('198.51.100.5')
  })
})
