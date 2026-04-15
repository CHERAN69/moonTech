'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { parseCSV } from '@/lib/matching/csv-parser'
import { runMatchingEngine } from '@/lib/matching/engine'
import { RawTransaction, CSVParseResult } from '@/types'
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

    // Simulate progress
    for (let i = 10; i <= 90; i += 10) {
      await new Promise(r => setTimeout(r, 200))
      setProgress(i)
    }

    const result = runMatchingEngine(
      bankResult.transactions,
      invoiceResult?.transactions || [],
    )

    setProgress(100)

    // In production: save to Supabase and redirect to results page
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                step > s ? 'bg-green-500 text-white' :
                step === s ? 'text-white' : 'bg-gray-100 text-gray-400'
              }`} style={step === s ? { background: '#1E3A5F' } : {}}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-sm font-medium ${step >= s ? 'text-gray-900' : 'text-gray-400'}`}>
                {s === 1 ? 'Upload Files' : s === 2 ? 'Confirm & Run' : 'Processing'}
              </span>
              {i < 2 && <div className="flex-1 h-px bg-gray-200 w-12"></div>}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-1">Reconciliation name</h2>
              <p className="text-sm text-gray-400 mb-4">Give this run a name so you can find it later</p>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              />
            </div>

            <FileUploadZone
              label="Bank Statement"
              description="Upload your bank statement CSV, PDF, or any export"
              required
              result={bankResult}
              dragOver={dragOver === 'bank'}
              onDragOver={() => setDragOver('bank')}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, 'bank')}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'bank')}
              icon="🏦"
            />

            <FileUploadZone
              label="Invoice / AR File"
              description="Upload invoices, AR export, or payment records (optional)"
              required={false}
              result={invoiceResult}
              dragOver={dragOver === 'invoice'}
              onDragOver={() => setDragOver('invoice')}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => handleDrop(e, 'invoice')}
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0], 'invoice')}
              icon="📄"
            />

            <button
              disabled={!bankResult}
              onClick={() => setStep(2)}
              className="w-full py-4 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: '#1E3A5F' }}
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && bankResult && (
          <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Ready to reconcile</h2>
              <div className="grid grid-cols-2 gap-4">
                <SummaryBox
                  label="Bank transactions"
                  count={bankResult.transactions.length}
                  total={bankResult.transactions.reduce((s, t) => s + t.amount, 0)}
                  icon="🏦"
                  warnings={bankResult.warnings}
                  errors={bankResult.errors}
                />
                {invoiceResult && (
                  <SummaryBox
                    label="Invoice records"
                    count={invoiceResult.transactions.length}
                    total={invoiceResult.transactions.reduce((s, t) => s + t.amount, 0)}
                    icon="📄"
                    warnings={invoiceResult.warnings}
                    errors={invoiceResult.errors}
                  />
                )}
              </div>

              <div className="mt-4 p-4 rounded-xl border" style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}>
                <div className="flex items-start gap-2">
                  <span>✨</span>
                  <div className="text-sm" style={{ color: '#1D4ED8' }}>
                    <strong>ClosePilot AI will:</strong> Match transactions using 3-pass algorithm → Flag anomalies with plain-English explanations → Suggest GL categories → Compute your Close Confidence Score
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-4 rounded-xl font-semibold text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors">
                ← Back
              </button>
              <button
                onClick={handleRun}
                disabled={isRunning}
                className="flex-2 flex-1 py-4 rounded-xl font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                style={{ background: '#1E3A5F' }}
              >
                Run Reconciliation ✨
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: '#EFF6FF' }}>
              <span className="text-4xl">{progress === 100 ? '✅' : '⚙️'}</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {progress === 100 ? 'Reconciliation complete!' : 'Running reconciliation...'}
            </h2>
            <p className="text-gray-400 text-sm mb-8">
              {progress === 100 ? 'Redirecting to your results...' : 'AI is matching transactions and analyzing anomalies'}
            </p>

            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: '#2E75B6' }}></div>
            </div>
            <div className="text-sm text-gray-400">
              {progress < 30 ? 'Parsing transactions...' :
               progress < 60 ? 'Running matching engine...' :
               progress < 90 ? 'AI analyzing anomalies...' :
               'Generating report...'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function FileUploadZone({ label, description, required, result, dragOver, onDragOver, onDragLeave, onDrop, onChange, icon }: {
  label: string
  description: string
  required: boolean
  result: CSVParseResult | null
  dragOver: boolean
  onDragOver: () => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  icon: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-1">
        <h3 className="font-semibold text-gray-900">{label}</h3>
        {required ? (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-50 text-red-500">Required</span>
        ) : (
          <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-400">Optional</span>
        )}
      </div>
      <p className="text-sm text-gray-400 mb-4">{description}</p>

      {result ? (
        <div className="p-4 rounded-xl border bg-green-50 border-green-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-500 font-semibold">✓ File loaded successfully</span>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium">{result.transactions.length}</span> transactions · Total: <span className="font-medium">{formatCurrency(result.transactions.reduce((s, t) => s + t.amount, 0))}</span>
          </div>
          {result.warnings.map((w, i) => (
            <div key={i} className="text-xs text-amber-600 mt-1">⚠ {w}</div>
          ))}
        </div>
      ) : (
        <label
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-8 cursor-pointer transition-all ${
            dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
          onDragOver={e => { e.preventDefault(); onDragOver() }}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <span className="text-4xl mb-3">{icon}</span>
          <div className="text-sm font-medium text-gray-700 mb-1">
            {dragOver ? 'Drop it!' : 'Drag & drop or click to upload'}
          </div>
          <div className="text-xs text-gray-400">Supports CSV, XLSX, PDF · Any bank format</div>
          <input type="file" accept=".csv,.xlsx,.pdf" onChange={onChange} className="hidden" />
        </label>
      )}
    </div>
  )
}

function SummaryBox({ label, count, total, icon, warnings, errors }: {
  label: string; count: number; total: number; icon: string; warnings: string[]; errors: string[]
}) {
  return (
    <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{icon}</span>
        <span className="font-medium text-gray-700 text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{count.toLocaleString()}</div>
      <div className="text-xs text-gray-400 mt-0.5">transactions · {formatCurrency(total)}</div>
      {errors.length > 0 && <div className="text-xs text-red-500 mt-2">{errors[0]}</div>}
      {warnings.length > 0 && <div className="text-xs text-amber-500 mt-1">{warnings[0]}</div>}
    </div>
  )
}
