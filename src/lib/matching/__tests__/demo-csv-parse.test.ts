/**
 * Demo CSV parsing test — validates that real-world CSV formats parse correctly
 */

import { describe, it, expect } from 'vitest'
import { parseCSV } from '../csv-parser'

function toBuffer(s: string): Buffer {
  return Buffer.from(s, 'utf8')
}

const BANK_CSV = `Date,Amount,Description,Vendor,Reference
2026-01-02,1500.00,Cloud infrastructure monthly,Amazon Web Services,INV-2026-001
2026-01-05,299.99,Slack subscription,Slack Technologies,INV-2026-002
2026-01-08,4200.00,Software contractor payment,Acme Consulting LLC,INV-2026-003
2026-01-15,750.00,Office supplies,Staples Corp,INV-2026-006
2026-01-22,$500.00,Round number payment,Mystery Vendor,
2026-01-28,"1,234.56",Comma-formatted amount,Test Vendor,INV-2026-013
`

const INVOICE_CSV = `Invoice Number,Date,Amount,Vendor,Due Date
INV-2026-001,01/02/2026,1500.00,Amazon Web Services,02/01/2026
INV-2026-002,Jan 5 2026,299.99,Slack Technologies,Feb 5 2026
INV-2026-003,2026-01-07,4200.00,Acme Consulting LLC,2026-02-07
INV-2026-006,2026-01-15,755.00,Staples Corp,2026-02-15
`

describe('CSV Parser — demo bank statement', () => {
  it('parses all 6 rows', async () => {
    const result = await parseCSV(toBuffer(BANK_CSV), 'demo_bank_jan2026.csv')
    console.log('  Parse errors:', result.errors)
    console.log('  Parse warnings:', result.warnings)
    expect(result.transactions.length).toBe(6)
  })

  it('detects date, amount, description columns', async () => {
    const result = await parseCSV(toBuffer(BANK_CSV), 'demo_bank_jan2026.csv')
    console.log('  Detected columns:', result.detected_columns)
    expect(result.detected_columns.date).toBeDefined()
    expect(result.detected_columns.amount).toBeDefined()
    expect(result.detected_columns.description).toBeDefined()
  })

  it('detects source_type as bank', async () => {
    const result = await parseCSV(toBuffer(BANK_CSV), 'demo_bank_jan2026.csv')
    expect(result.source_type).toBe('bank')
  })

  it('strips $ from amount', async () => {
    const result = await parseCSV(toBuffer(BANK_CSV), 'demo_bank_jan2026.csv')
    const row500 = result.transactions.find(r => r.amount === 500)
    console.log('  $500 row parsed:', row500?.amount, typeof row500?.amount)
    expect(row500?.amount).toBe(500)
  })

  it('parses comma-formatted amount "1,234.56"', async () => {
    const result = await parseCSV(toBuffer(BANK_CSV), 'demo_bank_jan2026.csv')
    const row = result.transactions.find(r => r.amount === 1234.56)
    console.log('  1234.56 row:', row?.amount)
    expect(row?.amount).toBe(1234.56)
  })

  it('parses ISO date 2026-01-02', async () => {
    const result = await parseCSV(toBuffer(BANK_CSV), 'demo_bank_jan2026.csv')
    expect(result.transactions[0].date).toBe('2026-01-02')
  })

  it('maps vendor and reference fields', async () => {
    const result = await parseCSV(toBuffer(BANK_CSV), 'demo_bank_jan2026.csv')
    const awsTx = result.transactions[0]
    console.log('  AWS transaction:', awsTx)
    expect(awsTx.vendor).toBe('Amazon Web Services')
    expect(awsTx.reference).toBe('INV-2026-001')
  })
})

describe('CSV Parser — demo invoice file', () => {
  it('parses all 4 rows', async () => {
    const result = await parseCSV(toBuffer(INVOICE_CSV), 'demo_invoices_jan2026.csv')
    console.log('  Invoice errors:', result.errors)
    expect(result.transactions.length).toBe(4)
  })

  it('detects source_type as invoice from filename', async () => {
    const result = await parseCSV(toBuffer(INVOICE_CSV), 'demo_invoices_jan2026.csv')
    expect(result.source_type).toBe('invoice')
  })

  it('parses US date format MM/DD/YYYY', async () => {
    const result = await parseCSV(toBuffer(INVOICE_CSV), 'demo_invoices_jan2026.csv')
    const awsTx = result.transactions[0]
    console.log('  US date parsed:', awsTx.date)
    expect(awsTx.date).toBe('2026-01-02')
  })

  it('parses text date format "Jan 5 2026"', async () => {
    const result = await parseCSV(toBuffer(INVOICE_CSV), 'demo_invoices_jan2026.csv')
    const slackTx = result.transactions[1]
    console.log('  Text date parsed:', slackTx.date)
    expect(slackTx.date).toBe('2026-01-05')
  })

  it('maps "Invoice Number" header to reference', async () => {
    const result = await parseCSV(toBuffer(INVOICE_CSV), 'demo_invoices_jan2026.csv')
    console.log('  Invoice detected columns:', result.detected_columns)
    expect(result.detected_columns.reference).toBeDefined()
    expect(result.transactions[0].reference).toBe('INV-2026-001')
  })
})

describe('CSV Parser — edge cases', () => {
  it('handles empty reference field gracefully', async () => {
    const result = await parseCSV(toBuffer(BANK_CSV), 'demo_bank_jan2026.csv')
    const mysteryTx = result.transactions.find(t => (t.vendor || '').includes('Mystery'))
    console.log('  Mystery vendor reference:', mysteryTx?.reference)
    expect(mysteryTx?.reference ?? '').toBe('')
  })

  it('does not crash when filename is omitted (undefined guard)', async () => {
    // This tests the bug fix: detectSourceType must not crash on undefined filename
    await expect(parseCSV(toBuffer(BANK_CSV), undefined as unknown as string)).resolves.toBeDefined()
  })

  it('does not crash on CSV with only headers', async () => {
    const result = await parseCSV(toBuffer('Date,Amount,Description\n'), 'test.csv')
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
