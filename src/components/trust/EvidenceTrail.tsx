'use client'

/**
 * EvidenceTrail — breadcrumb-style audit trail for a transaction.
 *
 * Shows the life of a document: Upload → Classification → Match → Review
 * Each step records who (human or AI) acted and when.
 */

import { useState } from 'react'

interface TrailStep {
  label: string
  actor: string
  timestamp?: string
  complete: boolean
  current?: boolean
}

interface EvidenceTrailProps {
  source_file: string
  upload_date: string
  session_name?: string
  original_row?: Record<string, string>
  classification?: string
  match_method?: string
  reviewed_by?: string
  reviewed_at?: string
  className?: string
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('default', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export function EvidenceTrail({
  source_file,
  upload_date,
  session_name,
  original_row,
  classification,
  match_method,
  reviewed_by,
  reviewed_at,
  className = '',
}: EvidenceTrailProps) {
  const [showRaw, setShowRaw] = useState(false)

  const steps: TrailStep[] = [
    {
      label: 'Upload',
      actor: 'User',
      timestamp: upload_date,
      complete: true,
    },
    {
      label: 'Classify',
      actor: 'AI',
      timestamp: upload_date,
      complete: !!classification,
      current: !classification,
    },
    {
      label: 'Match',
      actor: match_method === 'manual' ? 'User' : 'AI',
      complete: !!session_name,
      current: !!classification && !session_name,
    },
    {
      label: 'Review',
      actor: reviewed_by || 'Pending',
      timestamp: reviewed_at,
      complete: !!reviewed_at,
      current: !!session_name && !reviewed_at,
    },
  ]

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Source file */}
      <div className="flex items-start gap-2">
        <div
          className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5"
          style={{ background: '#EFF6FF' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#2E75B6" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-gray-700 truncate">{source_file}</p>
          <p className="text-[10px] text-gray-400">Uploaded {formatDate(upload_date)}</p>
        </div>
      </div>

      {/* Step breadcrumb */}
      <div className="flex items-start">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center">
            {/* Node */}
            <div
              className="flex flex-col items-center gap-0.5"
              title={`${step.label} · ${step.actor}${step.timestamp ? ' · ' + formatDate(step.timestamp) : ''}`}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
                style={{
                  background: step.complete ? '#16A34A' : step.current ? '#2E75B6' : '#E5E7EB',
                }}
              >
                {step.complete ? (
                  <CheckIcon />
                ) : (
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ background: step.current ? 'white' : '#9CA3AF' }}
                  />
                )}
              </div>
              <span
                className="text-[9px] font-medium whitespace-nowrap"
                style={{ color: step.complete ? '#15803D' : step.current ? '#1E3A5F' : '#9CA3AF' }}
              >
                {step.label}
              </span>
              <span className="text-[8px] text-gray-300 whitespace-nowrap">
                {step.actor}
              </span>
            </div>

            {/* Connector line */}
            {i < steps.length - 1 && (
              <div
                className="h-px w-6 flex-shrink-0 mb-5"
                style={{
                  background: steps[i + 1].complete || steps[i + 1].current ? '#86EFAC' : '#E5E7EB',
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Session name */}
      {session_name && (
        <p className="text-[10px] text-gray-400">
          Session: <span className="text-gray-600 font-medium">{session_name}</span>
        </p>
      )}

      {/* Original row data (collapsible) */}
      {original_row && Object.keys(original_row).length > 0 && (
        <div>
          <button
            onClick={() => setShowRaw(v => !v)}
            className="text-[10px] font-medium underline"
            style={{ color: '#2E75B6' }}
          >
            {showRaw ? 'Hide' : 'Show'} source row data
          </button>
          {showRaw && (
            <div className="mt-1.5 rounded-lg overflow-auto bg-gray-50 border border-gray-200 p-2 max-h-36">
              <table className="text-[10px] text-gray-600 w-full">
                <tbody>
                  {Object.entries(original_row).map(([k, v]) => (
                    <tr key={k} className="border-b border-gray-100 last:border-0">
                      <td className="pr-2 py-0.5 font-medium text-gray-500 whitespace-nowrap">{k}</td>
                      <td className="py-0.5 break-all">{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
