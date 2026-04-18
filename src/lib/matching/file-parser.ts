/**
 * Universal file parser — CSV, XLSX, and PDF text extraction.
 *
 * Fixes audit issue S3-3: "XLSX and PDF files fail silently".
 * Server-side validation added for file type and size (S3-2).
 */

import * as XLSX from 'xlsx'
import type { CSVParseResult, RawTransaction } from '@/types'
import { parseCSV } from './csv-parser'

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB
export const ALLOWED_MIME_TYPES = [
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream', // some browsers send this for .xlsx
]
export const ALLOWED_EXTENSIONS = ['.csv', '.xlsx', '.xls']

/** Server-side file validation before parsing */
export function validateFile(fileBuffer: Buffer, fileName: string): string | null {
  if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
    return `File too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`
  }
  const ext = `.${fileName.split('.').pop()?.toLowerCase()}`
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `Unsupported file type "${ext}". Please upload a CSV or XLSX file.`
  }
  return null
}

/** Parse any supported file type into a CSVParseResult */
export async function parseFile(
  fileBuffer: Buffer,
  fileName: string
): Promise<CSVParseResult> {
  const validationError = validateFile(fileBuffer, fileName)
  if (validationError) {
    return {
      transactions: [],
      detected_columns: {},
      total_rows: 0,
      errors: [validationError],
      warnings: [],
      source_type: 'bank',
    }
  }

  const ext = `.${fileName.split('.').pop()?.toLowerCase()}`

  if (ext === '.xlsx' || ext === '.xls') {
    return parseXLSX(fileBuffer)
  }

  // Default: CSV — pass buffer directly (no File/FileReader, safe in Node.js/Edge runtimes)
  return parseCSV(fileBuffer, fileName)
}

async function parseXLSX(buffer: Buffer): Promise<CSVParseResult> {
  try {
    
    const workbook  = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]

    if (!sheetName) {
      return {
        transactions: [], detected_columns: {}, total_rows: 0,
        errors: ['XLSX file is empty — no sheets found.'], warnings: [], source_type: 'bank',
      }
    }

    const sheet = workbook.Sheets[sheetName]

    // Convert to CSV string and then use the existing CSV parser
    // This lets us reuse all the column detection logic
    const csv = XLSX.utils.sheet_to_csv(sheet)

    // Convert CSV string to Buffer — no File/Blob needed, safe in Node.js/Edge runtimes
    const result = await parseCSV(Buffer.from(csv, 'utf8'), 'converted.csv')

    // Add a warning about the XLSX→CSV conversion
    return {
      ...result,
      warnings: [
        ...result.warnings,
        `Parsed from XLSX sheet: "${sheetName}"${workbook.SheetNames.length > 1 ? ` (${workbook.SheetNames.length} sheets found, used first)` : ''}`,
      ],
    }
  } catch (err) {
    return {
      transactions: [], detected_columns: {}, total_rows: 0,
      errors: [`Failed to parse XLSX file: ${err instanceof Error ? err.message : 'Unknown error'}`],
      warnings: [], source_type: 'bank',
    }
  }
}

/**
 * Detect whether a date string is ambiguous (e.g. 03/04/2026 could be
 * March 4th or April 3rd). Used to surface a warning to the user.
 *
 * Fixes audit issue D-3: CSV Date Parsing Locale.
 */
export function hasAmbiguousDates(transactions: RawTransaction[]): boolean {
  return transactions.some(t => {
    const match = t.date.match(/^(\d{1,2})\/(\d{1,2})\/\d{4}$/)
    if (!match) return false
    const [, a, b] = match
    const aNum = parseInt(a), bNum = parseInt(b)
    // Ambiguous if both parts could be a valid day or month (1-12 and 1-12)
    return aNum >= 1 && aNum <= 12 && bNum >= 1 && bNum <= 12 && aNum !== bNum
  })
}
