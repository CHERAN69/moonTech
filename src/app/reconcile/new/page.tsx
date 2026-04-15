/**
 * /reconcile/new → /inbox redirect
 * New file upload happens through the Inbox.
 */
import { redirect } from 'next/navigation'

export default function ReconcileNewPage() {
  redirect('/inbox')
}
