/**
 * /exceptions → /review redirect
 *
 * The exception queue has moved to /review as part of the
 * Phase 1 Information Architecture Refactor.
 * /review provides identical functionality without demo data.
 */
import { redirect } from 'next/navigation'

export default function ExceptionsPage() {
  redirect('/review')
}
