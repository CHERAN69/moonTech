'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { parseCSV } from '@/lib/matching/csv-parser'
import { runMatchingEngine } from '@/lib/matching/engine'
import { CSVParseResult } from '@/types'
import { formatCurrency } from '@/lib/utils'

type Step = 1 | 2 | 3

export default function NewReconciliationPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [bankResult, setBankResult] = useState<CSVParseResult | null>(null)
  const [invoiceResult, setInvoiceResult] = useState<CSVParseResult | null>(null)
  const [name, setName] = useState('April 2026 Bank Reconciliation')
  const [isRunning, setIsRunning] = useState(false)
  const [dragOver, setDragOver] = useState<'bank' | 'invoice' | null>(null)
  const [progress, setProgress] = useState(0)

  const handleFile = async (file: File, type: 'bank' | 'invoice') => {
    const result = await parseCSV(file)
    if (type === 'bank') setBankResult(result)
    else setInvoiceResult(result)
  }

  const handleDrop = useCallback((e: React.DragEvent, type: 'bank' | 'invoice') => {
    e.preventDefault()
    setDragOver(null)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file, type)
  }, [])

  const handleRun = async () => {
    if (!bankResult) return
    setIsRunning(true)
    setStep(3)
    for (let i = 10; i <= 90; i += 10) {
      await new Promise(r => setTimeout(r, 200))
      setProgress(i)
    }
    runMatchingEngine(bankResult.transactions, invoiceResult?.transactions || [])
    setProgress(100)
    await new Promise(r => setTimeout(r, 500))
    router.push('/reconcile/demo-result')
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title="New Reconciliation" subtitle="Upload your files and let AI do the work" />

      <div className="flex-1 p-6 max-w-3xl mx-auto w-full">
        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-8">
          {([1, 2, 3] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold"
                style={step > s ? { background: 'var(--success)', color: '#fff' } : step === s ? { background: 'var(--brand)', color: '#fff' } : { background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                {step > s ? '✓' : s}
              </div>
              <span className="text-sm font-medium" style={{ color: step >= s ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {s === 1 ? 'Upload Files' : s === 2 ? 'Confirm & Run' : 'Processing'}
              </span>
              {i < 2 && <div className="flex-1 h-px w-12" style={{ background: 'var(--border)' }}></div>}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Reconciliation name</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>Give this run a name so you can find it later</p>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
            </div>

            <FileUploadZone label="Bank Statement" description="Upload your bank statement CSV, PDF, or any export" required result={bankResult}
              dragOver={dragOver === 'bank'} onDragOver={() => setDragOver('bank')} onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, 'bank')} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'bank')} />

            <FileUploadZone label="Invoice / AR File" description="Upload invoices, AR export, or payment records (optional)" required={false} result={invoiceResult}
              dragOver={dragOver === 'invoice'} onDragOver={() => setDragOver('invoice')} onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, 'invoice')} onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'invoice')} />

            <button disabled={!bankResult} onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: 'var(--brand)' }}>
              Continue
            </button>
          </div>
        )}

        {step === 2 && bankResult && (
          <div className="space-y-5">
            <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Ready to reconcile</h2>
              <div className="grid grid-cols-2 gap-4">
                <SummaryBox label="Bank transactions" count={bankResult.transactions.length} total={bankResult.transactions.reduce((s, t) => s + t.amount, 0)} warnings={bankResult.warnings} errors={bankResult.errors} />
                {invoiceResult && (
                  <SummaryBox label="Invoice records" count={invoiceResult.transactions.length} total={invoiceResult.transactions.reduce((s, t) => s + t.amount, 0)} warnings={invoiceResult.warnings} errors={invoiceResult.errors} />
                )}
              </div>
              <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--info-bg)', border: '1px solid var(--info-border)' }}>
                <div className="flex items-start gap-2">
                  <div className="text-sm" style={{ color: 'var(--brand)' }}>
                    <strong>ClosePilot AI will:</strong> Match transactions using 3-pass algorithm → Flag anomalies → Suggest GL categories → Compute your Close Confidence Score
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl font-semibold transition-colors" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Back</button>
              <button onClick={handleRun} disabled={isRunning}
                className="flex-1 py-4 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: 'var(--brand)' }}>Run Reconciliation</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: 'var(--info-bg)' }}>
              <span className="text-4xl">{progress === 100 ? '✅' : '⚙️'}</span>
            </div>
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              {progress === 100 ? 'Reconciliation complete!' : 'Running reconciliation...'}
            </h2>
            <p className="text-sm mb-8" style={{ color: 'var(--text-tertiary)' }}>
              {progress === 100 ? 'Redirecting to your results...' : 'AI is matching transactions and analyzing anomalies'}
            </p>
            <div className="w-full h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--bg-tertiary)' }}>
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: 'var(--brand)' }}></div>
            </div>
            <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {progress < 30 ? 'Parsing transactions...' : progress < 60 ? 'Running matching engine...' : progress < 90 ? 'AI analyzing anomalies...' : 'Generating report...'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FileUploadZone({ label, description, required, result, dragOver, onDragOver, onDragLeave, onDrop, onChange }: {
  label: string; description: string; required: boolean; result: CSVParseResult | null; dragOver: boolean
  onDragOver: () => void; onDragLeave: () => void; onDrop: (e: React.DragEvent) => void; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="rounded-2xl p-6" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</h3>
        {required ? (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>Required</span>
        ) : (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>Optional</span>
        )}
      </div>
      <p className="text-sm mb-4" style={{ color: 'var(--text-tertiary)' }}>{description}</p>

      {result ? (
        <div className="p-4 rounded-xl" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-semibold" style={{ color: 'var(--success)' }}>✓ File loaded successfully</span>
          </div>
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            <span className="font-medium">{result.transactions.length}</span> transactions · Total: <span className="font-medium">{formatCurrency(result.transactions.reduce((s, t) => s + t.amount, 0))}</span>
          </div>
          {result.warnings.map((w, i) => (
            <div key={i} className="text-xs mt-1" style={{ color: 'var(--warning)' }}>⚠ {w}</div>
          ))}
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center rounded-xl p-8 cursor-pointer transition-all"
          style={{ border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`, background: dragOver ? 'var(--info-bg)' : 'transparent' }}
          onDragOver={e => { e.preventDefault(); onDragOver() }} onDragLeave={onDragLeave} onDrop={onDrop}>
          <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            {dragOver ? 'Drop it!' : 'Drag & drop or click to upload'}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Supports CSV, XLSX, PDF · Any bank format</div>
          <input type="file" accept=".csv,.xlsx,.pdf" onChange={onChange} className="hidden" />
        </label>
      )}
    </div>
  )
}

function SummaryBox({ label, count, total, warnings, errors }: {
  label: string; count: number; total: number; warnings: string[]; errors: string[]
}) {
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border)' }}>
      <span className="font-medium text-sm" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{count.toLocaleString()}</div>
      <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>transactions · {formatCurrency(total)}</div>
      {errors.length > 0 && <div className="text-xs mt-2" style={{ color: 'var(--error)' }}>{errors[0]}</div>}
      {warnings.length > 0 && <div className="text-xs mt-1" style={{ color: 'var(--warning)' }}>{warnings[0]}</div>}
    </div>
  )
}
