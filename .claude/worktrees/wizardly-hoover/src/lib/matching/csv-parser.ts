/**
 * ClosePilot AI — Universal CSV Parser
 *
 * Auto-detects column structure from any bank or invoice CSV.
 * No template required — drag, drop, parse.
 */

import Papa from 'papaparse'
import { RawTransaction, CSVParseResult, TransactionType } from '@/types'
import { parseISO, isValid, parse } from 'date-fns'

// ─── Column detection patterns ────────────────────────────────────────────────

const DATE_PATTERNS = ['date', 'transaction date', 'trans date', 'posting date', 'value date', 'created', 'time']
const AMOUNT_PATTERNS = ['amount', 'debit', 'credit', 'charge', 'payment', 'net amount', 'total', 'sum']
const DESCRIPTION_PATTERNS = ['description', 'memo', 'narrative', 'details', 'merchant', 'payee', 'name', 'note']
const VENDOR_PATTERNS = ['vendor', 'merchant', 'payee', 'company', 'supplier', 'from', 'counterparty']
const REFERENCE_PATTERNS = ['reference', 'ref', 'invoice', 'invoice no', 'invoice #', 'transaction id', 'check number', 'id']

const DATE_FORMATS = [
  'MM/dd/yyyy', 'dd/MM/yyyy', 'yyyy-MM-dd', 'MM-dd-yyyy',
  'dd-MM-yyyy', 'MMM d, yyyy', 'MMMM d, yyyy', 'MM/dd/yy',
  'yyyy/MM/dd', 'd MMM yyyy', 'dd MMM yyyy',
]

function detectColumn(headers: string[], patterns: string[]): string | null {
  const normalized = headers.map(h => h.toLowerCase().trim())
  for (const pattern of patterns) {
    const idx = normalized.findIndex(h => h === pattern || h.includes(pattern))
    if (idx >= 0) return headers[idx]
  }
  return null
}

function parseDate(value: string): string | null {
  if (!value) return null
  const trimmed = value.trim()

  // ISO 8601
  try {
    const d = parseISO(trimmed)
    if (isValid(d)) return d.toISOString().split('T')[0]
  } catch {}

  // Common formats
  for (const fmt of DATE_FORMATS) {
    try {
      const d = parse(trimmed, fmt, new Date())
      if (isValid(d)) return d.toISOString().split('T')[0]
    } catch {}
  }

  // Timestamp (Unix ms)
  const ts = parseInt(trimmed)
  if (!isNaN(ts) && ts > 1000000000) {
    const d = new Date(ts > 9999999999 ? ts : ts * 1000)
    if (isValid(d)) return d.toISOString().split('T')[0]
  }

  return null
}

function parseAmount(value: string): number | null {
  if (!value) return null
  const cleaned = value.replace(/[$,£€¥\s]/g, '').replace(/\((.+)\)/, '-$1').trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : Math.abs(num)
}

function detectSourceType(headers: string[], filename: string): TransactionType {
  const fn = filename.toLowerCase()
  if (fn.includes('stripe')) return 'stripe'
  if (fn.includes('paypal')) return 'paypal'
  if (fn.includes('invoice') || fn.includes('inv')) return 'invoice'
  if (fn.includes('expense')) return 'expense'

  const normalized = headers.map(h => h.toLowerCase()).join(' ')
  if (normalized.includes('payout') || normalized.includes('net amount') || normalized.includes('fee')) return 'stripe'
  if (normalized.includes('invoice')) return 'invoice'
  return 'bank'
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export async function parseCSV(file: File): Promise<CSVParseResult> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        const errors: string[] = []
        const warnings: string[] = []

        if (headers.length === 0) {
          resolve({ transactions: [], detected_columns: {}, total_rows: 0, errors: ['No headers detected. Make sure the first row contains column names.'], warnings: [], source_type: 'bank' })
          return
        }

        // Detect columns
        const dateCol = detectColumn(headers, DATE_PATTERNS)
        const amountCol = detectColumn(headers, AMOUNT_PATTERNS)
        const descCol = detectColumn(headers, DESCRIPTION_PATTERNS)
        const vendorCol = detectColumn(headers, VENDOR_PATTERNS)
        const refCol = detectColumn(headers, REFERENCE_PATTERNS)

        if (!dateCol) errors.push('Could not detect a date column. Ensure your CSV has a column named "Date", "Transaction Date", or similar.')
        if (!amountCol) errors.push('Could not detect an amount column. Ensure your CSV has a column named "Amount", "Debit", or similar.')
        if (!descCol) warnings.push('No description column detected — transaction descriptions will be empty.')

        const source_type = detectSourceType(headers, file.name)

        const transactions: RawTransaction[] = []
        let rowErrors = 0

        for (const row of results.data as Record<string, string>[]) {
          const rawDate = dateCol ? row[dateCol] : ''
          const rawAmount = amountCol ? row[amountCol] : ''
          const date = parseDate(rawDate)
          const amount = parseAmount(rawAmount)

          if (!date) { rowErrors++; continue }
          if (amount === null || amount === 0) { rowErrors++; continue }

          transactions.push({
            id: crypto.randomUUID(),
            date,
            amount,
            description: descCol ? (row[descCol] || '').trim() : '',
            vendor: vendorCol ? (row[vendorCol] || '').trim() : undefined,
            reference: refCol ? (row[refCol] || '').trim() : undefined,
            category: undefined,
            source: source_type,
            currency: 'USD',
            raw_row: row,
          })
        }

        if (rowErrors > 0) {
          warnings.push(`${rowErrors} row(s) were skipped due to missing or unparseable date/amount values.`)
        }

        if (transactions.length === 0) {
          errors.push('No valid transactions could be parsed. Please check your file format.')
        }

        resolve({
          transactions,
          detected_columns: {
            date: dateCol || '',
            amount: amountCol || '',
            description: descCol || '',
            vendor: vendorCol || '',
            reference: refCol || '',
          },
          total_rows: results.data.length,
          errors,
          warnings,
          source_type,
        })
      },
      error: (err) => {
        resolve({
          transactions: [],
          detected_columns: {},
          total_rows: 0,
          errors: [`CSV parse error: ${err.message}`],
          warnings: [],
          source_type: 'bank',
        })
      },
    })
  })
}
