/**
 * RBAC — Role-Based Access Control enforcement
 *
 * Roles (least → most privileged): viewer → reviewer → admin → owner
 * Use requireRole() in every API route that mutates financial data.
 */

import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { UserRole } from '@/types'

const ROLE_WEIGHT: Record<UserRole, number> = {
  viewer:   1,
  reviewer: 2,
  admin:    3,
  owner:    4,
}

/**
 * Returns the authenticated user's profile.
 * Returns null if unauthenticated or profile missing.
 */
export async function getProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('id, email, full_name, company_name, role, subscription_tier, subscription_status')
    .eq('id', userId)
    .single()
  return data
}

/**
 * Checks that the authenticated user has at least `minRole`.
 * Returns a 403 NextResponse if check fails, otherwise null.
 *
 * Usage:
 *   const guard = await requireRole(supabase, user.id, 'admin')
 *   if (guard) return guard
 */
export async function requireRole(
  supabase: SupabaseClient,
  userId: string,
  minRole: UserRole
): Promise<NextResponse | null> {
  const profile = await getProfile(supabase, userId)
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 })
  }
  const userWeight = ROLE_WEIGHT[profile.role as UserRole] ?? 0
  const required   = ROLE_WEIGHT[minRole]
  if (userWeight < required) {
    return NextResponse.json(
      { error: `Insufficient permissions. Required: ${minRole}, your role: ${profile.role}` },
      { status: 403 }
    )
  }
  return null
}

/**
 * Convenience: returns true if user has at least minRole (for client-side gates).
 */
export function hasRole(userRole: UserRole, minRole: UserRole): boolean {
  return (ROLE_WEIGHT[userRole] ?? 0) >= ROLE_WEIGHT[minRole]
}
