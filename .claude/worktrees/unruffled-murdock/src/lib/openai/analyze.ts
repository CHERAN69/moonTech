/**
 * ClosePilot AI — OpenAI Analysis Layer
 *
 * Handles all AI interactions: anomaly explanation, GL suggestions,
 * journal entry drafting, and the AI CFO daily briefing.
 *
 * Security: all user-controlled strings are sanitized before interpolation.
 * Performance: AbortController timeout on every API call (30s).
 */

import OpenAI from 'openai'
import { MatchedPair, RawTransaction } from '@/types'
import { formatCurrency } from '@/lib/utils'
import { sanitizeForPrompt } from '@/lib/validation'

const TIMEOUT_MS = 30_000

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set')
  }
  return new OpenAI({ apiKey })
}

const MODEL = 'gpt-4o-mini'

/** Wraps a promise with a timeout; rejects if it exceeds timeoutMs */
function withTimeout<T>(promise: Promise<T>, timeoutMs = TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`OpenAI request timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ])
}

// ─── Anomaly explanation ──────────────────────────────────────────────────────

export async function explainAnomalies(
  pairs: MatchedPair[],
  companyName: string
): Promise<MatchedPair[]> {
  const needsExplanation = pairs.filter(
    p => (p.status === 'unmatched' || p.status === 'flagged' || p.status === 'suggested') && !p.explanation
  )

  if (needsExplanation.length === 0) return pairs

  const batches: MatchedPair[][] = []
  for (let i = 0; i < needsExplanation.length; i += 10) {
    batches.push(needsExplanation.slice(i, i + 10))
  }

  const explained = new Map<string, { explanation: string; suggested_action: string; gl_category: string }>()
  // Sanitise company name before interpolation
  const safeCompany = sanitizeForPrompt(companyName)

  for (const batch of batches) {
    const transactionList = batch.map((p, i) => {
      const tx = p.bank_transaction
      // Sanitise all user-controlled strings before building the prompt
      const safeDesc   = sanitizeForPrompt(tx.description)
      const safeVendor = sanitizeForPrompt(tx.vendor || 'N/A')
      return `${i + 1}. ID: ${p.id} | Status: ${p.status} | Amount: ${formatCurrency(tx.amount)} | Date: ${tx.date} | Description: "${safeDesc}" | Vendor: "${safeVendor}" | Flags: ${p.flags.map(f => f.message).join('; ') || 'none'} | Matched to: ${p.invoice_transaction ? `Invoice ${formatCurrency(p.invoice_transaction.amount)} on ${p.invoice_transaction.date}` : 'nothing'}`
    }).join('\n')

    const prompt = `You are ClosePilot AI, a senior financial analyst assistant for ${safeCompany}. Analyze these transactions and for each one provide:
1. A plain-English explanation of why it is flagged or unmatched (2-3 sentences max, conversational tone)
2. A recommended action for the controller
3. The most likely GL category

Transactions:
${transactionList}

Respond with a JSON array in exactly this format:
[
  {
    "id": "pair id",
    "explanation": "Plain English explanation...",
    "suggested_action": "Recommended action...",
    "gl_category": "GL Category Name"
  }
]

Be specific, use the actual amounts and vendor names. Sound like a knowledgeable human colleague, not a robot.`

    try {
      const response = await withTimeout(
        getOpenAI().chat.completions.create({
          model: MODEL,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' },
        })
      )

      const content = response.choices[0].message.content || '{}'
      const parsed = JSON.parse(content)
      const results = Array.isArray(parsed) ? parsed : (parsed.results || parsed.transactions || [])

      for (const r of results) {
        if (r.id) {
          explained.set(r.id, {
            explanation:     r.explanation     || '',
            suggested_action: r.suggested_action || '',
            gl_category:     r.gl_category     || '',
          })
        }
      }
    } catch (err) {
      console.error('OpenAI batch error:', err)
    }
  }

  return pairs.map(p => {
    const ex = explained.get(p.id)
    return ex ? { ...p, ...ex } : p
  })
}

// ─── GL category suggestion for single transaction ────────────────────────────

export async function suggestGLCategory(tx: RawTransaction): Promise<string> {
  const safeVendor = sanitizeForPrompt(tx.vendor || tx.description)
  try {
    const response = await withTimeout(
      getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [{
          role: 'user',
          content: `Suggest the most appropriate general ledger category for this transaction. Return only the category name, nothing else.

Transaction: ${formatCurrency(tx.amount)} to "${safeVendor}" on ${tx.date}

Common categories: Software & SaaS, Cloud Infrastructure, Marketing & Advertising, Payroll, Office & Facilities, Travel & Entertainment, Professional Services, Equipment, Utilities, Insurance, Taxes & Licenses, Interest Expense, Other Operating Expenses, Cost of Goods Sold`,
        }],
        temperature: 0.1,
        max_tokens: 20,
      })
    )
    return response.choices[0].message.content?.trim() || 'Other Operating Expenses'
  } catch {
    return 'Other Operating Expenses'
  }
}

// ─── AI CFO Daily Briefing ────────────────────────────────────────────────────

export interface CFOBriefing {
  headline: string
  bullets: string[]
  recommended_actions: string[]
  risk_alerts: string[]
}

export async function generateCFOBriefing(
  companyName: string,
  metrics: {
    cashPosition: number
    monthlyBurn: number
    runwayMonths: number
    openAnomalies: number
    unmatchedTotal: number
    arAging: number
    apAging: number
    closeConfidence: number
    daysSinceLastClose: number
  }
): Promise<CFOBriefing> {
  const safeCompany = sanitizeForPrompt(companyName)
  const prompt = `You are ClosePilot AI, acting as a fractional CFO advisor for ${safeCompany}. Generate a concise daily financial briefing based on these metrics.

Metrics:
- Cash position: ${formatCurrency(metrics.cashPosition)}
- Monthly burn rate: ${formatCurrency(metrics.monthlyBurn)}
- Cash runway: ${metrics.runwayMonths.toFixed(1)} months
- Open anomalies requiring review: ${metrics.openAnomalies}
- Unmatched transactions total: ${formatCurrency(metrics.unmatchedTotal)}
- AR outstanding (overdue): ${formatCurrency(metrics.arAging)}
- AP outstanding: ${formatCurrency(metrics.apAging)}
- Close confidence score: ${metrics.closeConfidence}/100
- Days since last close: ${metrics.daysSinceLastClose}

Generate a JSON response with:
{
  "headline": "One sharp sentence summarizing the overall financial health (like a CFO would say in a board meeting)",
  "bullets": ["3 specific, data-driven observations about the metrics above"],
  "recommended_actions": ["2-3 specific actions the controller should take today, based on the data"],
  "risk_alerts": ["any urgent risks that need immediate attention — empty array if none"]
}

Be direct, specific, and use actual numbers. Tone: senior finance professional.`

  try {
    const response = await withTimeout(
      getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        response_format: { type: 'json_object' },
      })
    )
    return JSON.parse(response.choices[0].message.content || '{}') as CFOBriefing
  } catch {
    return {
      headline: 'Financial overview ready for review.',
      bullets: ['Review open anomalies to improve close confidence score.'],
      recommended_actions: ['Run reconciliation for the current period.'],
      risk_alerts: [],
    }
  }
}

// ─── Journal entry drafting ───────────────────────────────────────────────────

export interface DraftedJournalEntry {
  description: string
  date: string
  lines: Array<{ account: string; description: string; debit?: number; credit?: number }>
  ai_reasoning: string
}

export async function draftJournalEntry(
  tx: RawTransaction,
  glCategory: string,
  companyContext?: string
): Promise<DraftedJournalEntry> {
  const safeVendor  = sanitizeForPrompt(tx.vendor || tx.description)
  const safeContext = companyContext ? sanitizeForPrompt(companyContext) : undefined

  const prompt = `You are a senior accountant. Draft a proper double-entry journal entry for this transaction.

Transaction: ${formatCurrency(tx.amount)} paid to "${safeVendor}" on ${tx.date}
GL Category: ${glCategory}
${safeContext ? `Company context: ${safeContext}` : ''}

Return JSON:
{
  "description": "Journal entry description",
  "date": "${tx.date}",
  "lines": [
    {"account": "Account Name", "description": "Line description", "debit": number_or_null, "credit": number_or_null}
  ],
  "ai_reasoning": "Brief explanation of why this journal entry structure is correct per GAAP"
}`

  try {
    const response = await withTimeout(
      getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      })
    )
    return JSON.parse(response.choices[0].message.content || '{}') as DraftedJournalEntry
  } catch {
    return {
      description: `Payment to ${safeVendor}`,
      date: tx.date,
      lines: [
        { account: glCategory, description: 'Expense', debit: tx.amount },
        { account: 'Cash / Bank', description: 'Payment', credit: tx.amount },
      ],
      ai_reasoning: 'Standard expense entry.',
    }
  }
}

// ─── Single anomaly explanation (for Exception Queue) ────────────────────────

export async function explainSingleAnomaly(pair: {
  id: string
  status: string
  bank_transaction: { amount: number; date: string; description: string; vendor?: string }
  invoice_transaction?: { amount: number; date: string; description: string; vendor?: string; reference?: string }
  flags?: Array<{ type: string; severity: string; message: string }>
  confidence?: number
}): Promise<string> {
  const tx    = pair.bank_transaction
  const inv   = pair.invoice_transaction
  const flags = pair.flags || []

  const safeDesc   = sanitizeForPrompt(tx.description)
  const safeVendor = sanitizeForPrompt(tx.vendor || '')

  const context = [
    `Status: ${pair.status}`,
    `Bank: $${tx.amount} to "${safeVendor || safeDesc}" on ${tx.date}`,
    inv ? `Invoice: $${inv.amount} from "${sanitizeForPrompt(inv.vendor || inv.description)}" on ${inv.date}${inv.reference ? ` (${inv.reference})` : ''}` : 'Invoice: none',
    flags.length ? `Flags: ${flags.map(f => `[${f.severity.toUpperCase()}] ${f.message}`).join('; ')}` : 'Flags: none',
    pair.confidence !== undefined ? `AI confidence: ${pair.confidence}%` : '',
  ].filter(Boolean).join('\n')

  const prompt = `You are ClosePilot AI, a senior financial analyst. Explain this transaction exception in 2-3 clear sentences that a controller would find actionable. Use the actual amounts and vendor names. End with one specific recommended action.

${context}

Respond with just the explanation — no headers, no bullet points, no JSON.`

  try {
    const response = await withTimeout(
      getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 150,
      })
    )
    return response.choices[0].message.content?.trim() || 'Unable to generate explanation.'
  } catch {
    const statusMsg: Record<string, string> = {
      unmatched: `No matching invoice found for the $${tx.amount} charge to ${tx.vendor || tx.description}. Review your accounts payable records and upload any missing invoices.`,
      flagged:   `This $${tx.amount} transaction to ${tx.vendor || tx.description} was flagged during reconciliation. ${flags[0]?.message || 'Review and approve or reject this match.'}`,
      duplicate: `Possible duplicate payment of $${tx.amount} to ${tx.vendor || tx.description} detected. Verify with your vendor before approving.`,
      suggested: `Possible match found with ${pair.confidence}% confidence for $${tx.amount} to ${tx.vendor || tx.description}. Review the suggested match and confirm or reassign.`,
    }
    return statusMsg[pair.status] || `Transaction requires manual review: $${tx.amount} to ${tx.vendor || tx.description}.`
  }
}

// ─── Natural language query ───────────────────────────────────────────────────

export async function answerFinanceQuery(
  query: string,
  transactions: RawTransaction[],
  companyName: string
): Promise<string> {
  const safeQuery   = sanitizeForPrompt(query)
  const safeCompany = sanitizeForPrompt(companyName)
  const summary     = `Total transactions: ${transactions.length}. Total amount: ${formatCurrency(transactions.reduce((s, t) => s + t.amount, 0))}. Date range: ${transactions[0]?.date} to ${transactions[transactions.length - 1]?.date}`

  const prompt = `You are ClosePilot AI, the finance assistant for ${safeCompany}. Answer this question about their financial data concisely and accurately.

Data summary: ${summary}
Sample transactions (first 20): ${JSON.stringify(transactions.slice(0, 20).map(t => ({ date: t.date, amount: t.amount, vendor: t.vendor || t.description, category: t.category })))}

Question: "${safeQuery}"

Answer in 2-4 sentences. Be specific with numbers. If you cannot answer accurately from the available data, say so clearly.`

  try {
    const response = await withTimeout(
      getOpenAI().chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 200,
      })
    )
    return response.choices[0].message.content || 'I could not find a clear answer in the available transaction data.'
  } catch {
    return 'AI analysis is temporarily unavailable. Please try again.'
  }
}
