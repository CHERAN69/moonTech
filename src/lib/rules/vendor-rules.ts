import { createClient } from '@/lib/supabase/server'

export interface VendorRule {
  id: string
  user_id: string
  vendor_pattern: string        // regex or normalized vendor name
  gl_category: string           // auto-assign this GL category
  auto_approve: boolean
  auto_approve_threshold: number // e.g., 90
  created_from: 'manual' | 'learned'
  times_applied: number
  last_applied: string
}

// Normalize vendor name for matching (lowercase, trim, remove special chars)
function normalizeVendor(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()
}

// Match a transaction against a list of vendor rules
// Returns the first matching rule, or null
export async function matchVendorRules(
  transaction: { description?: string; vendor?: string },
  rules: VendorRule[]
): Promise<VendorRule | null> {
  const vendorText = normalizeVendor(transaction.vendor || transaction.description || '')
  if (!vendorText) return null

  for (const rule of rules) {
    try {
      const pattern = new RegExp(rule.vendor_pattern, 'i')
      if (pattern.test(vendorText)) return rule
    } catch {
      // If vendor_pattern isn't valid regex, do substring match
      if (vendorText.includes(normalizeVendor(rule.vendor_pattern))) return rule
    }
  }
  return null
}

// Called after an exception is approved — check if a rule should be created
// If the same vendor+GL has been approved 3+ times, creates an auto-approve rule
export async function learnRule(
  userId: string,
  vendorName: string,
  glCategory: string
): Promise<VendorRule | null> {
  const supabase = await createClient()

  // Count how many times this vendor+GL combo has been approved
  const { count } = await supabase
    .from('exception_approvals')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('vendor_name', normalizeVendor(vendorName))
    .eq('gl_category', glCategory)

  // Record this approval
  await supabase.from('exception_approvals').insert({
    user_id: userId,
    vendor_name: normalizeVendor(vendorName),
    gl_category: glCategory,
    approved_at: new Date().toISOString(),
  })

  // If threshold reached (3 approvals), create or update vendor rule
  if ((count || 0) >= 2) {  // 2 previous + this one = 3 total
    const normalizedPattern = normalizeVendor(vendorName)

    // Check if rule already exists
    const { data: existing } = await supabase
      .from('vendor_rules')
      .select('id, times_applied')
      .eq('user_id', userId)
      .eq('vendor_pattern', normalizedPattern)
      .maybeSingle()

    if (existing) {
      // Update times_applied
      await supabase
        .from('vendor_rules')
        .update({ times_applied: (existing.times_applied || 0) + 1, last_applied: new Date().toISOString() })
        .eq('id', existing.id)
      return null
    }

    // Create new rule
    const { data: newRule } = await supabase
      .from('vendor_rules')
      .insert({
        user_id: userId,
        vendor_pattern: normalizedPattern,
        gl_category: glCategory,
        auto_approve: true,
        auto_approve_threshold: 90,
        created_from: 'learned',
        times_applied: 1,
        last_applied: new Date().toISOString(),
      })
      .select()
      .single()

    return newRule as VendorRule | null
  }

  return null
}
