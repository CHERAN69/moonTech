/**
 * ClosePilot AI — Reconciliation Matching Engine
 *
 * Two-pass approach:
 * 1. Deterministic rules (exact + fuzzy) → handles ~75% of transactions
 * 2. AI layer (OpenAI) → explains anomalies, fills gaps, scores everything
 */

import { RawTransaction, MatchedPair, MatchStatus, MatchFlag, MatchMethod } from '@/types'
import { differenceInDays, parseISO } from 'date-fns'

// ─── Config ──────────────────────────────────────────────────────────────────

const CONFIG = {
  DATE_TOLERANCE_DAYS: 3,
  AMOUNT_EXACT_TOLERANCE: 0.01,     // 1 cent — float precision
  AMOUNT_FUZZY_TOLERANCE: 0.02,     // 2% — for fees/rounding
  VENDOR_SIMILARITY_THRESHOLD: 0.72, // 72% Jaro-Winkler
  DUPLICATE_AMOUNT_WINDOW_DAYS: 5,
  ANOMALY_AMOUNT_DEVIATION: 0.25,   // 25% deviation flags anomaly
}

// ─── String similarity (Jaro-Winkler) ───────────────────────────────────────

function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1
  const len1 = s1.length
  const len2 = s2.length
  const matchDist = Math.floor(Math.max(len1, len2) / 2) - 1
  const s1Matches = new Array(len1).fill(false)
  const s2Matches = new Array(len2).fill(false)
  let matches = 0
  let transpositions = 0

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist)
    const end = Math.min(i + matchDist + 1, len2)
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue
      s1Matches[i] = true
      s2Matches[j] = true
      matches++
      break
    }
  }

  if (matches === 0) return 0

  const s1m = s1.split('').filter((_, i) => s1Matches[i])
  const s2m = s2.split('').filter((_, i) => s2Matches[i])
  for (let i = 0; i < s1m.length; i++) {
    if (s1m[i] !== s2m[i]) transpositions++
  }

  return (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3
}

function jaroWinkler(s1: string, s2: string, p = 0.1): number {
  const jaro = jaroSimilarity(s1, s2)
  let prefix = 0
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++
    else break
  }
  return jaro + prefix * p * (1 - jaro)
}

// ─── Vendor normalization ────────────────────────────────────────────────────

const VENDOR_NORMALIZATIONS: Record<string, string> = {
  'amzn': 'amazon',
  'amzn mktp': 'amazon',
  'amazon web services': 'aws',
  'amazon web svc': 'aws',
  'goog': 'google',
  'google *': 'google',
  'msft': 'microsoft',
  'microsoft corporation': 'microsoft',
  'sq *': 'square',
  'paypal *': 'paypal',
  'stripe': 'stripe',
  'twlo': 'twilio',
}

export function normalizeVendor(name: string): string {
  if (!name) return ''
  let normalized = name.toLowerCase()
    .replace(/[*\-_#@!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  for (const [pattern, replacement] of Object.entries(VENDOR_NORMALIZATIONS)) {
    if (normalized.startsWith(pattern) || normalized.includes(pattern)) {
      normalized = replacement
      break
    }
  }

  // Remove common suffixes
  normalized = normalized.replace(/\b(inc|llc|ltd|corp|co|company)\b\.?/gi, '').trim()
  return normalized
}

function vendorSimilarity(a: string, b: string): number {
  const na = normalizeVendor(a)
  const nb = normalizeVendor(b)
  if (na === nb) return 1
  if (!na || !nb) return 0
  return jaroWinkler(na, nb)
}

// ─── Date helpers ─────────────────────────────────────────────────────────────

function dateDiff(a: string, b: string): number {
  try {
    return Math.abs(differenceInDays(parseISO(a), parseISO(b)))
  } catch {
    return 999
  }
}

// ─── Duplicate detection ─────────────────────────────────────────────────────

function isDuplicate(tx: RawTransaction, pool: RawTransaction[]): boolean {
  return pool.some(other =>
    other.id !== tx.id &&
    Math.abs(other.amount - tx.amount) < CONFIG.AMOUNT_EXACT_TOLERANCE &&
    dateDiff(other.date, tx.date) <= CONFIG.DUPLICATE_AMOUNT_WINDOW_DAYS &&
    vendorSimilarity(other.vendor || other.description, tx.vendor || tx.description) > 0.85
  )
}

// ─── Build flags ─────────────────────────────────────────────────────────────

function buildFlags(
  bank: RawTransaction,
  invoice: RawTransaction | undefined,
  confidence: number,
  allBankTx: RawTransaction[],
  historicalAverages: Map<string, number>
): MatchFlag[] {
  const flags: MatchFlag[] = []

  // Duplicate detection
  if (isDuplicate(bank, allBankTx.filter(t => t.id !== bank.id))) {
    flags.push({
      type: 'duplicate',
      severity: 'high',
      message: `Possible duplicate: another transaction with a similar amount and vendor was found within ${CONFIG.DUPLICATE_AMOUNT_WINDOW_DAYS} days.`,
    })
  }

  // Amount deviation against historical average
  const vendorKey = normalizeVendor(bank.vendor || bank.description)
  const avg = historicalAverages.get(vendorKey)
  if (avg && avg > 0) {
    const deviation = Math.abs(bank.amount - avg) / avg
    if (deviation > CONFIG.ANOMALY_AMOUNT_DEVIATION) {
      flags.push({
        type: 'amount_deviation',
        severity: deviation > 0.5 ? 'high' : 'medium',
        message: `This charge is ${Math.round(deviation * 100)}% ${bank.amount > avg ? 'above' : 'below'} the average for ${vendorKey || 'this vendor'} ($${avg.toFixed(2)} avg vs $${bank.amount.toFixed(2)} now).`,
      })
    }
  }

  // Missing invoice
  if (!invoice && confidence < 50) {
    flags.push({
      type: 'missing_invoice',
      severity: 'medium',
      message: `No matching invoice found for this transaction. Consider creating a manual entry or requesting the invoice from the vendor.`,
    })
  }

  // Round number fraud heuristic
  if (bank.amount % 100 === 0 && bank.amount > 500) {
    flags.push({
      type: 'fraud_pattern',
      severity: 'low',
      message: `Round-number transaction detected ($${bank.amount}). While often legitimate, this pattern can indicate manual entry errors or fraudulent charges.`,
    })
  }

  return flags
}

// ─── Confidence scoring ───────────────────────────────────────────────────────

function scoreMatch(
  bank: RawTransaction,
  invoice: RawTransaction
): { confidence: number; method: MatchMethod } {
  const amountDiff = Math.abs(bank.amount - invoice.amount)
  const daysDiff = dateDiff(bank.date, invoice.date)
  const similarity = vendorSimilarity(
    bank.vendor || bank.description,
    invoice.vendor || invoice.description
  )

  // Exact match
  if (
    amountDiff <= CONFIG.AMOUNT_EXACT_TOLERANCE &&
    daysDiff <= CONFIG.DATE_TOLERANCE_DAYS &&
    similarity > 0.9
  ) {
    return { confidence: 97, method: 'exact' }
  }

  // Reference/invoice ID match
  const bankRef = (bank.reference || '').trim().toLowerCase()
  const invRef = (invoice.reference || '').trim().toLowerCase()
  if (bankRef && invRef && bankRef === invRef) {
    const amountScore = amountDiff <= CONFIG.AMOUNT_EXACT_TOLERANCE ? 20 : amountDiff / bank.amount < 0.05 ? 10 : 0
    return { confidence: Math.min(95, 75 + amountScore), method: 'exact' }
  }

  // Fuzzy match scoring
  let score = 0
  // Amount (40 pts max)
  if (amountDiff <= CONFIG.AMOUNT_EXACT_TOLERANCE) score += 40
  else if (amountDiff / bank.amount <= CONFIG.AMOUNT_FUZZY_TOLERANCE) score += 30
  else if (amountDiff / bank.amount <= 0.05) score += 15

  // Date (30 pts max)
  if (daysDiff === 0) score += 30
  else if (daysDiff <= 1) score += 25
  else if (daysDiff <= CONFIG.DATE_TOLERANCE_DAYS) score += 18
  else if (daysDiff <= 7) score += 8

  // Vendor similarity (30 pts max)
  score += Math.round(similarity * 30)

  const method: MatchMethod = score >= 70 ? 'fuzzy_ai' : 'fuzzy_ai'
  return { confidence: Math.min(95, score), method }
}

// ─── Close Confidence Score ──────────────────────────────────────────────────

export function computeCloseConfidenceScore(pairs: MatchedPair[]): number {
  if (pairs.length === 0) return 0

  const total = pairs.length
  const matched = pairs.filter(p => p.status === 'matched').length
  const flagged = pairs.filter(p => p.status === 'flagged').length
  const highFlags = pairs.reduce((acc, p) =>
    acc + p.flags.filter(f => f.severity === 'high').length, 0)

  const baseScore = (matched / total) * 100
  const flagPenalty = (flagged / total) * 20
  const highFlagPenalty = Math.min(30, highFlags * 5)

  return Math.max(0, Math.min(100, Math.round(baseScore - flagPenalty - highFlagPenalty)))
}

// ─── Main matching function ───────────────────────────────────────────────────

export interface MatchingResult {
  pairs: MatchedPair[]
  close_confidence_score: number
  stats: {
    matched: number
    unmatched: number
    flagged: number
    duplicates: number
    total_matched_amount: number
    total_unmatched_amount: number
  }
}

export function runMatchingEngine(
  bankTransactions: RawTransaction[],
  invoiceTransactions: RawTransaction[],
  historicalAverages: Map<string, number> = new Map()
): MatchingResult {
  const pairs: MatchedPair[] = []
  const usedInvoices = new Set<string>()
  const usedBank = new Set<string>()

  // Sort bank transactions by date
  const sortedBank = [...bankTransactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  // Pass 1: Exact + high-confidence matches
  for (const bank of sortedBank) {
    let bestMatch: { invoice: RawTransaction; score: ReturnType<typeof scoreMatch> } | null = null

    for (const invoice of invoiceTransactions) {
      if (usedInvoices.has(invoice.id)) continue
      const score = scoreMatch(bank, invoice)
      if (score.confidence >= 90) {
        if (!bestMatch || score.confidence > bestMatch.score.confidence) {
          bestMatch = { invoice, score }
        }
      }
    }

    if (bestMatch) {
      usedInvoices.add(bestMatch.invoice.id)
      usedBank.add(bank.id)
      const flags = buildFlags(bank, bestMatch.invoice, bestMatch.score.confidence, bankTransactions, historicalAverages)
      pairs.push({
        id: crypto.randomUUID(),
        bank_transaction: bank,
        invoice_transaction: bestMatch.invoice,
        status: flags.some(f => f.severity === 'high') ? 'flagged' : 'matched',
        confidence: bestMatch.score.confidence,
        match_method: bestMatch.score.method,
        flags,
        created_at: new Date().toISOString(),
      })
    }
  }

  // Pass 2: Suggested matches (60-89 confidence)
  for (const bank of sortedBank) {
    if (usedBank.has(bank.id)) continue

    let bestMatch: { invoice: RawTransaction; score: ReturnType<typeof scoreMatch> } | null = null

    for (const invoice of invoiceTransactions) {
      if (usedInvoices.has(invoice.id)) continue
      const score = scoreMatch(bank, invoice)
      if (score.confidence >= 60) {
        if (!bestMatch || score.confidence > bestMatch.score.confidence) {
          bestMatch = { invoice, score }
        }
      }
    }

    if (bestMatch) {
      usedInvoices.add(bestMatch.invoice.id)
      usedBank.add(bank.id)
      const flags = buildFlags(bank, bestMatch.invoice, bestMatch.score.confidence, bankTransactions, historicalAverages)
      pairs.push({
        id: crypto.randomUUID(),
        bank_transaction: bank,
        invoice_transaction: bestMatch.invoice,
        status: 'suggested',
        confidence: bestMatch.score.confidence,
        match_method: bestMatch.score.method,
        flags,
        created_at: new Date().toISOString(),
      })
    }
  }

  // Pass 3: Unmatched bank transactions
  for (const bank of sortedBank) {
    if (usedBank.has(bank.id)) continue
    const flags = buildFlags(bank, undefined, 0, bankTransactions, historicalAverages)
    const isDupe = flags.some(f => f.type === 'duplicate')
    pairs.push({
      id: crypto.randomUUID(),
      bank_transaction: bank,
      invoice_transaction: undefined,
      status: isDupe ? 'duplicate' : 'unmatched',
      confidence: 0,
      match_method: 'rule',
      flags,
      created_at: new Date().toISOString(),
    })
  }

  // Pass 4: Unmatched invoices → add as standalone unmatched
  for (const invoice of invoiceTransactions) {
    if (usedInvoices.has(invoice.id)) continue
    pairs.push({
      id: crypto.randomUUID(),
      bank_transaction: { ...invoice, id: `phantom-${invoice.id}`, source: 'bank' },
      invoice_transaction: invoice,
      status: 'unmatched',
      confidence: 0,
      match_method: 'rule',
      flags: [{
        type: 'missing_invoice',
        severity: 'medium',
        message: 'Invoice exists but no matching bank payment was found.',
      }],
      created_at: new Date().toISOString(),
    })
  }

  const stats = {
    matched: pairs.filter(p => p.status === 'matched').length,
    unmatched: pairs.filter(p => p.status === 'unmatched').length,
    flagged: pairs.filter(p => p.status === 'flagged').length,
    duplicates: pairs.filter(p => p.status === 'duplicate').length,
    total_matched_amount: pairs
      .filter(p => p.status === 'matched')
      .reduce((sum, p) => sum + p.bank_transaction.amount, 0),
    total_unmatched_amount: pairs
      .filter(p => p.status === 'unmatched')
      .reduce((sum, p) => sum + p.bank_transaction.amount, 0),
  }

  const close_confidence_score = computeCloseConfidenceScore(pairs)

  return { pairs, close_confidence_score, stats }
}
