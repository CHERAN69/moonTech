/**
 * /reconcile → /inbox redirect
 * Upload and reconciliation now happens through /inbox.
 * Phase 2 — Universal upload + AI classification.
 */
import { redirect } from 'next/navigation'

export default function ReconcilePage() {
  redirect('/inbox')
}
