/**
 * /dashboard → /inbox redirect
 *
 * Dashboard replaced by Inbox as the primary workspace entry point.
 * Phase 1 — Information Architecture Refactor.
 */
import { redirect } from 'next/navigation'

export default function DashboardPage() {
  redirect('/inbox')
}
