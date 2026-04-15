import { describe, it, expect } from 'vitest'
import { runMatchingEngine, normalizeVendor, computeCloseConfidenceScore } from '../engine'
import type { RawTransaction } from '@/types'

function makeTx(overrides: Partial<RawTransaction> & { id: string }): RawTransaction {
  return {
    date: '2024-01-15',
    amount: 100,
    description: 'Test vendor',
    source: 'bank',
    currency: 'USD',
    ...overrides,
  }
}

// ─── normalizeVendor ─────────────────────────────────────────────────────────

describe('normalizeVendor', () => {
  it('lowercases and strips special chars', () => {
    expect(normalizeVendor('Amazon*MKTPLACE')).toBe('amazon')
  })

  it('maps known aliases', () => {
    expect(normalizeVendor('AMZN MKTP US')).toBe('amazon')
    expect(normalizeVendor('MSFT')).toBe('microsoft')
    expect(normalizeVendor('GOOG *Services')).toBe('google')
  })

  it('strips corporate suffixes', () => {
    expect(normalizeVendor('Acme Inc.')).toBe('acme')
    expect(normalizeVendor('Widget LLC')).toBe('widget')
  })

  it('returns empty string for falsy input', () => {
    expect(normalizeVendor('')).toBe('')
  })
})

// ─── runMatchingEngine — exact match ────────────────────────────────────────

describe('runMatchingEngine — exact match', () => {
  it('matches bank and invoice with identical amount, date, and vendor', () => {
    const bank = makeTx({ id: 'b1', date: '2024-01-15', amount: 250.00, description: 'Stripe payment', source: 'bank' })
    const invoice = makeTx({ id: 'i1', date: '2024-01-15', amount: 250.00, description: 'Stripe payment', source: 'invoice' })

    const result = runMatchingEngine([bank], [invoice])
    expect(result.stats.matched).toBe(1)
    expect(result.stats.unmatched).toBe(0)
    expect(result.pairs[0].status).toBe('matched')
    expect(result.pairs[0].confidence).toBeGreaterThanOrEqual(90)
  })

  it('matches within date tolerance (3 days)', () => {
    const bank = makeTx({ id: 'b2', date: '2024-01-15', amount: 99.99, description: 'AWS charges', source: 'bank' })
    const invoice = makeTx({ id: 'i2', date: '2024-01-17', amount: 99.99, description: 'Amazon web services', source: 'invoice' })

    const result = runMatchingEngine([bank], [invoice])
    expect(result.stats.matched + result.pairs.filter(p => p.status === 'suggested').length).toBeGreaterThanOrEqual(1)
  })

  it('leaves unmatched when no invoice provided', () => {
    const bank = makeTx({ id: 'b3', date: '2024-01-15', amount: 500, description: 'Unknown vendor', source: 'bank' })

    const result = runMatchingEngine([bank], [])
    expect(result.stats.unmatched).toBe(1)
    expect(result.pairs[0].status).toBe('unmatched')
  })
})

// ─── runMatchingEngine — duplicate detection ─────────────────────────────────

describe('runMatchingEngine — duplicate detection', () => {
  it('flags duplicate bank transactions', () => {
    const b1 = makeTx({ id: 'b1', date: '2024-01-15', amount: 100, description: 'Office Depot', source: 'bank' })
    const b2 = makeTx({ id: 'b2', date: '2024-01-16', amount: 100, description: 'Office Depot', source: 'bank' })

    const result = runMatchingEngine([b1, b2], [])
    const dupeOrFlagged = result.pairs.filter(p =>
      p.status === 'duplicate' || p.flags.some(f => f.type === 'duplicate')
    )
    expect(dupeOrFlagged.length).toBeGreaterThanOrEqual(1)
  })
})

// ─── runMatchingEngine — anomaly detection ────────────────────────────────────

describe('runMatchingEngine — amount deviation anomaly', () => {
  it('flags amount that deviates >25% from historical average', () => {
    const historicalAverages = new Map([['stripe', 100]])
    const bank = makeTx({ id: 'b1', date: '2024-01-15', amount: 200, description: 'Stripe payment', source: 'bank' })

    const result = runMatchingEngine([bank], [], historicalAverages)
    const amountFlag = result.pairs[0].flags.find(f => f.type === 'amount_deviation')
    expect(amountFlag).toBeDefined()
    expect(amountFlag?.severity).toBe('high')
  })

  it('does not flag when amount is within 25% of average', () => {
    const historicalAverages = new Map([['stripe', 100]])
    const bank = makeTx({ id: 'b2', date: '2024-01-15', amount: 110, description: 'Stripe payment', source: 'bank' })

    const result = runMatchingEngine([bank], [], historicalAverages)
    const amountFlag = result.pairs[0].flags.find(f => f.type === 'amount_deviation')
    expect(amountFlag).toBeUndefined()
  })
})

// ─── computeCloseConfidenceScore ─────────────────────────────────────────────

describe('computeCloseConfidenceScore', () => {
  it('returns 0 for empty pairs', () => {
    expect(computeCloseConfidenceScore([])).toBe(0)
  })

  it('returns 100 for all matched with no flags', () => {
    const pair = {
      id: 'p1',
      bank_transaction: makeTx({ id: 'b1' }),
      invoice_transaction: makeTx({ id: 'i1', source: 'invoice' }),
      status: 'matched' as const,
      confidence: 97,
      match_method: 'exact' as const,
      flags: [],
      created_at: new Date().toISOString(),
    }
    expect(computeCloseConfidenceScore([pair])).toBe(100)
  })

  it('penalizes flagged transactions', () => {
    const matched = {
      id: 'p1',
      bank_transaction: makeTx({ id: 'b1' }),
      invoice_transaction: makeTx({ id: 'i1', source: 'invoice' }),
      status: 'matched' as const,
      confidence: 97,
      match_method: 'exact' as const,
      flags: [],
      created_at: new Date().toISOString(),
    }
    const flagged = {
      id: 'p2',
      bank_transaction: makeTx({ id: 'b2' }),
      invoice_transaction: makeTx({ id: 'i2', source: 'invoice' }),
      status: 'flagged' as const,
      confidence: 70,
      match_method: 'fuzzy_ai' as const,
      flags: [{ type: 'duplicate' as const, severity: 'high' as const, message: 'dup' }],
      created_at: new Date().toISOString(),
    }
    const score = computeCloseConfidenceScore([matched, flagged])
    expect(score).toBeLessThan(100)
  })
})
